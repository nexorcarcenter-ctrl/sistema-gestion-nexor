const router = require("express").Router();
const pool = require("../db");

// Solo admin puede ver información financiera
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Requiere permisos de administrador" });
  }
  next();
}
router.use(requireAdmin);

// Ventas cobradas del período + sus líneas que son productos del catálogo.
// Las líneas de servicio no matchean products (guardan un service_type_id),
// por eso el ingreso por servicios se deduce restando, y así no se pierde
// plata de las ventas que quedaron sin detalle de ítems cargado.
const CTE_BASE = `
  WITH v AS (
    SELECT s.id, s.total, s.items_json, s.payments_json
    FROM sales s
    WHERE s.status = 'completed'
      AND COALESCE(s.sale_date, s.created_at) >= $1::date
      AND COALESCE(s.sale_date, s.created_at) <  ($2::date + 1)
  ),
  items AS (
    SELECT v.id AS sale_id, e AS item
    FROM v
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN v.items_json IS NULL OR v.items_json = '' THEN '[]'::jsonb
           ELSE v.items_json::jsonb END
    ) e
  ),
  prod AS (
    SELECT
      p.id                                              AS product_id,
      p.name                                            AS nombre,
      p.category                                        AS categoria,
      COALESCE((i.item->>'total')::numeric, 0)          AS venta,
      COALESCE(p.cost_price, 0)
        * COALESCE((i.item->>'quantity')::numeric, 0)   AS costo,
      COALESCE((i.item->>'quantity')::numeric, 0)       AS cantidad
    FROM items i
    JOIN products p ON p.id::text = i.item->>'product_id'
  ),
  svc AS (
    SELECT
      st.name                                           AS nombre,
      COALESCE((i.item->>'total')::numeric, 0)          AS venta,
      COALESCE((i.item->>'quantity')::numeric, 0)       AS cantidad
    FROM items i
    JOIN service_types st ON st.id::text = i.item->>'product_id'
  ),
  pagos AS (
    SELECT
      COALESCE(NULLIF(e->>'method_name', ''), 'Sin especificar') AS nombre,
      COALESCE((e->>'amount_uyu')::numeric, 0)                   AS monto
    FROM v
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN v.payments_json IS NULL OR v.payments_json = '' THEN '[]'::jsonb
           ELSE v.payments_json::jsonb END
    ) e
  )
`;

// Totales de un período. Devuelve siempre números, nunca null.
async function totales(desde, hasta) {
  const { rows } = await pool.query(`
    ${CTE_BASE}
    SELECT
      (SELECT COUNT(*)                 FROM v)    AS ventas,
      (SELECT COALESCE(SUM(total),0)   FROM v)    AS ingresos,
      (SELECT COALESCE(SUM(venta),0)   FROM prod) AS ingresos_productos,
      (SELECT COALESCE(SUM(costo),0)   FROM prod) AS costo_productos
  `, [desde, hasta]);

  const r = rows[0] || {};
  const ventas            = Number(r.ventas) || 0;
  const ingresos          = Number(r.ingresos) || 0;
  const ingresosProductos = Number(r.ingresos_productos) || 0;
  const costoProductos    = Number(r.costo_productos) || 0;

  // La mano de obra es ganancia pura: no se le imputa costo.
  // Se calcula por diferencia para no perder las ventas sin ítems cargados.
  const ingresosServicios = Math.max(ingresos - ingresosProductos, 0);
  const utilidad          = ingresos - costoProductos;

  return {
    ventas,
    ingresos,
    ingresos_productos: ingresosProductos,
    ingresos_servicios: ingresosServicios,
    costo_productos: costoProductos,
    utilidad,
    margen: ingresos > 0 ? (utilidad / ingresos) * 100 : 0,
    ticket_promedio: ventas > 0 ? ingresos / ventas : 0,
  };
}

// Período anterior de igual duración, inmediatamente previo
function periodoAnterior(desde, hasta) {
  const d = new Date(`${desde}T00:00:00Z`);
  const h = new Date(`${hasta}T00:00:00Z`);
  const dias = Math.round((h - d) / 86400000) + 1;
  const finPrev = new Date(d.getTime() - 86400000);
  const iniPrev = new Date(finPrev.getTime() - (dias - 1) * 86400000);
  const iso = (x) => x.toISOString().slice(0, 10);
  return { desde: iso(iniPrev), hasta: iso(finPrev) };
}

function rangoValido(desde, hasta) {
  return /^\d{4}-\d{2}-\d{2}$/.test(desde) && /^\d{4}-\d{2}-\d{2}$/.test(hasta) && desde <= hasta;
}

// GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/summary", async (req, res) => {
  const { from, to } = req.query;
  if (!rangoValido(from, to)) {
    return res.status(400).json({ error: "Rango de fechas inválido (se espera from y to como YYYY-MM-DD)" });
  }
  try {
    const prev = periodoAnterior(from, to);
    const [actual, anterior, inventario] = await Promise.all([
      totales(from, to),
      totales(prev.desde, prev.hasta),
      pool.query(`
        SELECT
          COUNT(*)                                                             AS productos,
          COALESCE(SUM(COALESCE(cost_price,0) * COALESCE(stock_quantity,0)),0) AS valor_inventario,
          COUNT(*) FILTER (WHERE COALESCE(stock_quantity,0) <= COALESCE(min_stock,0)) AS stock_bajo
        FROM products
        WHERE is_active IS NOT FALSE
      `).then(({ rows }) => ({
        productos: Number(rows[0].productos) || 0,
        valor_inventario: Number(rows[0].valor_inventario) || 0,
        stock_bajo: Number(rows[0].stock_bajo) || 0,
      })),
    ]);
    res.json({ periodo: { desde: from, hasta: to }, actual, anterior, inventario });
  } catch (err) {
    console.error("Reports summary error:", err);
    res.status(500).json({ error: "Error al calcular el resumen" });
  }
});

// GET /api/reports/timeseries?months=6 — evolución mensual
router.get("/timeseries", async (req, res) => {
  const meses = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 36);
  try {
    const { rows } = await pool.query(`
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - make_interval(months => $1::int - 1),
          date_trunc('month', CURRENT_DATE),
          '1 month'
        ) AS mes
      ),
      v AS (
        SELECT date_trunc('month', COALESCE(s.sale_date, s.created_at)) AS mes,
               s.id, s.total, s.items_json
        FROM sales s
        WHERE s.status = 'completed'
          AND COALESCE(s.sale_date, s.created_at) >= date_trunc('month', CURRENT_DATE) - make_interval(months => $1::int - 1)
      ),
      costos AS (
        SELECT v.mes,
               SUM(COALESCE(p.cost_price,0) * COALESCE((e.item->>'quantity')::numeric,0)) AS costo
        FROM v
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN v.items_json IS NULL OR v.items_json = '' THEN '[]'::jsonb ELSE v.items_json::jsonb END
        ) AS e(item)
        JOIN products p ON p.id::text = e.item->>'product_id'
        GROUP BY v.mes
      ),
      ingresos AS (
        SELECT mes, SUM(total) AS ingresos, COUNT(*) AS ventas FROM v GROUP BY mes
      )
      SELECT
        to_char(m.mes, 'YYYY-MM')                AS mes,
        COALESCE(i.ingresos, 0)                  AS ingresos,
        COALESCE(c.costo, 0)                     AS costo,
        COALESCE(i.ingresos, 0) - COALESCE(c.costo, 0) AS utilidad,
        COALESCE(i.ventas, 0)                    AS ventas
      FROM meses m
      LEFT JOIN ingresos i ON i.mes = m.mes
      LEFT JOIN costos   c ON c.mes = m.mes
      ORDER BY m.mes
    `, [meses]);

    res.json(rows.map((r) => ({
      mes: r.mes,
      ingresos: Number(r.ingresos) || 0,
      costo: Number(r.costo) || 0,
      utilidad: Number(r.utilidad) || 0,
      ventas: Number(r.ventas) || 0,
    })));
  } catch (err) {
    console.error("Reports timeseries error:", err);
    res.status(500).json({ error: "Error al calcular la evolución mensual" });
  }
});

// GET /api/reports/top?from&to&limit=6 — rankings de productos y servicios
router.get("/top", async (req, res) => {
  const { from, to } = req.query;
  const limite = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 50);
  if (!rangoValido(from, to)) {
    return res.status(400).json({ error: "Rango de fechas inválido (se espera from y to como YYYY-MM-DD)" });
  }
  try {
    const { rows: productos } = await pool.query(`
      ${CTE_BASE}
      SELECT nombre, categoria,
             SUM(cantidad)        AS cantidad,
             SUM(venta)           AS venta,
             SUM(venta - costo)   AS utilidad
      FROM prod
      GROUP BY nombre, categoria
      ORDER BY utilidad DESC
      LIMIT ${limite}
    `, [from, to]);

    const { rows: servicios } = await pool.query(`
      ${CTE_BASE}
      SELECT nombre, SUM(cantidad) AS cantidad, SUM(venta) AS venta
      FROM svc
      GROUP BY nombre
      ORDER BY venta DESC
      LIMIT ${limite}
    `, [from, to]);

    const { rows: categorias } = await pool.query(`
      ${CTE_BASE}
      SELECT COALESCE(NULLIF(categoria,''), 'Sin categoría') AS nombre, SUM(venta) AS venta
      FROM prod
      GROUP BY 1
      ORDER BY venta DESC
    `, [from, to]);

    const { rows: formasPago } = await pool.query(`
      ${CTE_BASE}
      SELECT nombre, SUM(monto) AS monto, COUNT(*) AS operaciones
      FROM pagos
      GROUP BY nombre
      ORDER BY monto DESC
    `, [from, to]);

    const num = (r, ...ks) => ks.reduce((o, k) => ({ ...o, [k]: Number(r[k]) || 0 }), { ...r });
    res.json({
      productos: productos.map((r) => num(r, "cantidad", "venta", "utilidad")),
      servicios: servicios.map((r) => num(r, "cantidad", "venta")),
      categorias: categorias.map((r) => num(r, "venta")),
      formas_pago: formasPago.map((r) => num(r, "monto", "operaciones")),
    });
  } catch (err) {
    console.error("Reports top error:", err);
    res.status(500).json({ error: "Error al calcular los rankings" });
  }
});

module.exports = router;
