const router = require("express").Router();
const pool = require("../db");
const permisos = require("../permissions");

/**
 * Ventas directas a credito y sus cobros.
 *
 * Una venta a credito descuenta el stock en el momento, pero el ingreso
 * cuenta a medida que se cobra (cada cobro es una fila en payments con su
 * fecha), igual que el gasto de una compra cuenta cuando se paga.
 *
 * Los cobros en efectivo entran en la caja abierta: la caja arma el arqueo
 * desde payments, asi que alcanza con guardar el cobro con su caja. Los
 * cobros por transferencia o tarjeta no necesitan caja.
 */

const PLAZO_MAXIMO = 365;
const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

function fallar(status, mensaje, extra) {
  const err = new Error(mensaje);
  err.status = status;
  err.extra = extra;
  throw err;
}

async function enTransaccion(res, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch (err) {
    await client.query("ROLLBACK");
    if (!err.status) console.error("Credit error:", err);
    res.status(err.status || 500).json({ error: err.status ? err.message : "Error al guardar", ...(err.extra || {}) });
    return undefined;
  } finally {
    client.release();
  }
}

async function datosUsuario(req) {
  const { rows } = await pool.query("SELECT full_name FROM users WHERE id = $1", [req.user.id]);
  return { id: String(req.user.id), nombre: rows[0]?.full_name || req.user.username || "" };
}

// Mismo criterio que sequence.js (V-000123), pero con lock: dos ventas a la
// vez no pueden salir con el mismo numero
async function siguienteNumeroVenta(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('sale_number'))");
  const { rows } = await client.query(`
    SELECT COALESCE(MAX(NULLIF(regexp_replace(sale_number, '^V-', ''), '')::int), 0) AS ultimo
    FROM sales WHERE sale_number ~ '^V-[0-9]+$'
  `);
  return `V-${String(Number(rows[0].ultimo) + 1).padStart(6, "0")}`;
}

/**
 * Lee un cobro y lo deja listo para guardar. Si es en efectivo exige una caja
 * abierta; si es con otro medio la caja no hace falta.
 */
async function leerCobro(client, pago, cajaId) {
  const monto = redondear(pago.amount);
  if (!(monto > 0)) fallar(400, "Los montos tienen que ser mayores a cero");
  const { rows } = await client.query(
    "SELECT id, name, type, currency FROM payment_methods WHERE id::text = $1",
    [String(pago.method_id || "")]
  );
  const metodo = rows[0];
  if (!metodo) fallar(400, "Elegí la forma de pago");
  const moneda = metodo.currency === "USD" ? "USD" : "UYU";
  const tc = moneda === "USD" ? Number(pago.exchange_rate) : 1;
  if (!(tc > 0)) fallar(400, "Poné el tipo de cambio");

  let caja = null;
  if (metodo.type === "cash") {
    if (!cajaId) fallar(409, "Para cobrar en efectivo tiene que haber una caja abierta");
    const { rows: c } = await client.query("SELECT id FROM cash_registers WHERE id::text = $1 AND status = 'open'", [String(cajaId)]);
    if (!c[0]) fallar(409, "La caja no está abierta: abrila para cobrar en efectivo");
    caja = String(c[0].id);
  }
  return { metodo, moneda, tc, monto, enPesos: redondear(monto * tc), caja };
}

async function guardarCobro(client, venta, cobro, fecha, notas, usuario) {
  const { rows: [p] } = await client.query(
    `INSERT INTO payments (sale_id, customer_id, order_number, cash_register_id, customer_name, amount, currency,
       payment_method, payment_method_id, payment_method_name, exchange_rate, amount_uyu_equivalent,
       paid_at, payment_date, notes, created_by, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()::text,$13,$14,$15,$16) RETURNING *`,
    [String(venta.id), venta.customer_id, venta.sale_number, cobro.caja, venta.customer_name, cobro.monto,
     cobro.moneda, cobro.metodo.type, String(cobro.metodo.id), cobro.metodo.name, cobro.tc, cobro.enPesos,
     fecha, notas || null, usuario.id, usuario.nombre]
  );
  return p;
}

// Lo cobrado, el estado y los cobros como historial dentro de la venta
async function actualizarEstadoVenta(client, ventaId) {
  const { rows: [v] } = await client.query("SELECT total FROM sales WHERE id = $1", [ventaId]);
  const { rows: cobros } = await client.query(
    `SELECT payment_method_id AS method_id, payment_method_name AS method_name, payment_method AS type,
            currency, amount, amount_uyu_equivalent AS amount_uyu, exchange_rate, payment_date
     FROM payments WHERE sale_id = $1 ORDER BY payment_date, created_at`,
    [String(ventaId)]
  );
  const cobrado = redondear(cobros.reduce((s, c) => s + Number(c.amount_uyu), 0));
  const total = redondear(v.total);
  const estado = cobrado >= total - 0.009 ? "paid" : cobrado > 0 ? "partial" : "pending";
  const pesos = cobros.filter((c) => c.currency !== "USD").reduce((s, c) => s + Number(c.amount), 0);
  const dolares = cobros.filter((c) => c.currency === "USD").reduce((s, c) => s + Number(c.amount), 0);
  await client.query(
    `UPDATE sales SET paid_amount = $1, payment_status = $2, payments_json = $3,
       total_uyu = $4, total_usd = $5, updated_at = NOW() WHERE id = $6`,
    [cobrado, estado, JSON.stringify(cobros), redondear(pesos), redondear(dolares), ventaId]
  );
}

async function ventaCompleta(id) {
  const { rows } = await pool.query("SELECT * FROM sales WHERE id::text = $1", [id]);
  if (!rows[0]) return null;
  const { rows: cobros } = await pool.query(
    "SELECT * FROM payments WHERE sale_id = $1 ORDER BY payment_date, created_at",
    [String(id)]
  );
  let cliente = null;
  if (rows[0].customer_id) {
    const { rows: c } = await pool.query("SELECT * FROM customers WHERE id::text = $1", [rows[0].customer_id]);
    cliente = c[0] || null;
  }
  return { ...rows[0], cobros, cliente };
}

async function responderVenta(res, id, status = 200) {
  try {
    res.status(status).json(await ventaCompleta(id));
  } catch {
    res.status(status).json({ id });
  }
}

// Fecha de hoy en Uruguay: el servidor corre en UTC y despues de las 21 hs
// ya seria "mañana"
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Montevideo" });
const fechaValida = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(f || "") ? f : null);

// POST /api/credit/sales — venta directa a credito, con entrega inicial opcional
router.post("/sales", async (req, res) => {
  if (!permisos.puede(req.user?.role, "venderACredito")) {
    return res.status(403).json({ error: "No tenés permisos para vender a crédito" });
  }
  const b = req.body || {};
  const dias = parseInt(b.credit_days, 10);
  const items = (Array.isArray(b.items) ? b.items : []).map((i) => ({
    product_id: i.product_id ? String(i.product_id) : "",
    product_name: (i.product_name || "").trim(),
    sku: i.sku || "",
    quantity: Number(i.quantity),
    unit_price: redondear(i.unit_price),
  }));
  if (!b.customer_id) return res.status(400).json({ error: "Elegí el cliente" });
  if (!(dias >= 1 && dias <= PLAZO_MAXIMO)) return res.status(400).json({ error: "Elegí el plazo del crédito" });
  if (!items.length) return res.status(400).json({ error: "Agregá al menos un producto" });
  if (items.some((i) => !i.product_name)) return res.status(400).json({ error: "Hay un ítem sin descripción" });
  if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0)) return res.status(400).json({ error: "Las cantidades tienen que ser enteros mayores a cero" });
  if (items.some((i) => i.unit_price < 0)) return res.status(400).json({ error: "Hay un precio negativo" });
  const usuario = await datosUsuario(req);

  const id = await enTransaccion(res, async (client) => {
    const { rows: cli } = await client.query("SELECT * FROM customers WHERE id::text = $1 AND is_active IS NOT FALSE", [String(b.customer_id)]);
    const cliente = cli[0];
    if (!cliente) fallar(400, "El cliente no existe");

    const total = redondear(items.reduce((s, i) => s + i.quantity * i.unit_price, 0));
    const entregas = [];
    for (const p of (Array.isArray(b.pagos) ? b.pagos : [])) entregas.push(await leerCobro(client, p, b.cash_register_id));
    const entregado = redondear(entregas.reduce((s, e) => s + e.enPesos, 0));
    // A credito no hay vuelto: si se entrega todo, es una venta de contado
    if (entregado > total + 0.009) fallar(400, "La entrega supera el total de la venta");

    const numero = await siguienteNumeroVenta(client);
    const lineas = items.map((i) => ({ ...i, total: redondear(i.quantity * i.unit_price) }));
    const { rows: [venta] } = await client.query(
      `INSERT INTO sales (sale_number, sale_date, sale_type, customer_id, customer_name, customer_phone, vehicle,
         items_json, items_count, total, subtotal, payment_type, credit_days, due_date, paid_amount,
         payment_status, status, cash_register_id, notes, cashier)
       VALUES ($1, NOW(), 'direct', $2, $3, $4, $5, $6, $7, $8, $8, 'credito', $9::int, $13::date + $9::int, 0,
         'pending', 'completed', $10, $11, $12)
       RETURNING *`,
      [numero, String(cliente.id), cliente.name, cliente.phone || "", (b.vehicle || "").trim(),
       JSON.stringify(lineas), lineas.length, total, dias, b.cash_register_id || null, (b.notes || "").trim() || null, usuario.nombre, hoy()]
    );

    // Stock: mismo registro que deja routes/stock.js
    for (const i of lineas.filter((l) => l.product_id)) {
      const { rows: pr } = await client.query("SELECT id, name, sku, stock_quantity FROM products WHERE id::text = $1 FOR UPDATE", [i.product_id]);
      const p = pr[0];
      if (!p) fallar(400, `El producto ${i.product_name} ya no existe`);
      const anterior = Number(p.stock_quantity) || 0;
      const nuevo = Math.max(0, anterior - i.quantity);
      await client.query("UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2", [nuevo, p.id]);
      await client.query(
        `INSERT INTO stock_movements (product_id, product_name, sku, movement_type, quantity, previous_stock, new_stock,
           reference_type, reference_number, reason, created_at, updated_at)
         VALUES ($1,$2,$3,'sale',$4,$5,$6,'sale',$7,$8,NOW(),NOW())`,
        [p.id, p.name, p.sku || "", nuevo - anterior, anterior, nuevo, numero, `Venta a crédito a ${cliente.name}`]
      );
    }

    for (const e of entregas) await guardarCobro(client, venta, e, hoy(), "Entrega inicial", usuario);
    await actualizarEstadoVenta(client, venta.id);
    return venta.id;
  });
  if (id) responderVenta(res, id, 201);
});

// POST /api/credit/sales/:id/collections — cobrar (todo o parte de) lo que se debe
router.post("/sales/:id/collections", async (req, res) => {
  const b = req.body || {};
  const fecha = fechaValida(b.payment_date) || hoy();
  const usuario = await datosUsuario(req);
  const id = await enTransaccion(res, async (client) => {
    const { rows } = await client.query("SELECT * FROM sales WHERE id::text = $1 FOR UPDATE", [req.params.id]);
    const venta = rows[0];
    if (!venta) fallar(404, "Venta no encontrada");
    if (venta.payment_type !== "credito") fallar(409, "Esta venta no es a crédito");
    if (venta.status === "cancelled") fallar(409, "La venta está anulada");
    const saldo = redondear(Number(venta.total) - Number(venta.paid_amount || 0));
    const cobro = await leerCobro(client, b, b.cash_register_id);
    if (cobro.enPesos > saldo + 0.009) fallar(400, `El cobro supera lo que se debe ($${saldo})`);
    await guardarCobro(client, venta, cobro, fecha, (b.notes || "").trim(), usuario);
    await actualizarEstadoVenta(client, venta.id);
    return venta.id;
  });
  if (id) responderVenta(res, id, 201);
});

// DELETE /api/credit/sales/:id/collections/:pagoId — deshacer un cobro cargado por error
router.delete("/sales/:id/collections/:pagoId", async (req, res) => {
  if (!permisos.puede(req.user?.role, "venderACredito")) {
    return res.status(403).json({ error: "No tenés permisos para borrar cobros" });
  }
  const id = await enTransaccion(res, async (client) => {
    const { rows } = await client.query("SELECT * FROM sales WHERE id::text = $1 FOR UPDATE", [req.params.id]);
    if (!rows[0]) fallar(404, "Venta no encontrada");
    const { rows: borrado } = await client.query(
      "DELETE FROM payments WHERE id::text = $1 AND sale_id = $2 RETURNING cash_register_id",
      [req.params.pagoId, String(rows[0].id)]
    );
    if (!borrado[0]) fallar(404, "Cobro no encontrado");
    // Un cobro de una caja ya cerrada es parte de un arqueo que no se puede rehacer
    if (borrado[0].cash_register_id) {
      const { rows: c } = await client.query("SELECT status FROM cash_registers WHERE id::text = $1", [borrado[0].cash_register_id]);
      if (c[0] && c[0].status !== "open") fallar(409, "Ese cobro es de una caja ya cerrada: no se puede borrar");
    }
    await actualizarEstadoVenta(client, rows[0].id);
    return rows[0].id;
  });
  if (id) responderVenta(res, id);
});

// GET /api/credit/receivables — ventas a credito con saldo, por vencimiento
router.get("/receivables", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, sale_number, customer_id, customer_name, customer_phone, sale_date, due_date, credit_days,
             total, COALESCE(paid_amount, 0) AS paid_amount, total - COALESCE(paid_amount, 0) AS saldo,
             payment_status, (due_date - $1::date) AS dias_para_vencer
      FROM sales
      WHERE payment_type = 'credito' AND status = 'completed' AND payment_status <> 'paid'
      ORDER BY due_date NULLS LAST, sale_date
    `, [hoy()]);
    const n = (v) => Number(v) || 0;
    res.json(rows.map((r) => ({
      ...r, total: n(r.total), paid_amount: n(r.paid_amount), saldo: n(r.saldo),
      dias_para_vencer: r.dias_para_vencer == null ? null : n(r.dias_para_vencer),
    })));
  } catch (err) {
    console.error("Receivables error:", err);
    res.status(500).json({ error: "Error al cargar las cuentas a cobrar" });
  }
});

// GET /api/credit/customers — clientes con su saldo
router.get("/customers", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
             COALESCE(s.debe, 0) AS debe, COALESCE(s.vencido, 0) AS vencido,
             COALESCE(s.ventas, 0) AS ventas_credito, s.ultima_venta
      FROM customers c
      LEFT JOIN (
        SELECT customer_id,
               SUM(total - COALESCE(paid_amount, 0)) FILTER (WHERE payment_status <> 'paid') AS debe,
               SUM(total - COALESCE(paid_amount, 0)) FILTER (WHERE payment_status <> 'paid' AND due_date < $1::date) AS vencido,
               COUNT(*) AS ventas, MAX(sale_date) AS ultima_venta
        FROM sales WHERE payment_type = 'credito' AND status = 'completed'
        GROUP BY customer_id
      ) s ON s.customer_id = c.id::text
      WHERE c.is_active IS NOT FALSE
      ORDER BY c.name
    `, [hoy()]);
    const n = (v) => Number(v) || 0;
    res.json(rows.map((r) => ({ ...r, debe: n(r.debe), vencido: n(r.vencido), ventas_credito: n(r.ventas_credito) })));
  } catch (err) {
    console.error("Customers error:", err);
    res.status(500).json({ error: "Error al cargar los clientes" });
  }
});

// GET /api/credit/customers/:id — ficha: ventas a credito y cobros
router.get("/customers/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows: c } = await pool.query("SELECT * FROM customers WHERE id::text = $1", [id]);
    if (!c[0]) return res.status(404).json({ error: "Cliente no encontrado" });
    const { rows: ventas } = await pool.query(`
      SELECT id, sale_number, sale_date, due_date, credit_days, total, COALESCE(paid_amount, 0) AS paid_amount,
             total - COALESCE(paid_amount, 0) AS saldo, payment_status, items_count
      FROM sales WHERE customer_id = $1 AND payment_type = 'credito' AND status = 'completed'
      ORDER BY sale_date DESC
    `, [id]);
    const { rows: cobros } = await pool.query(`
      SELECT id, sale_id, order_number AS sale_number, payment_date, amount, currency, amount_uyu_equivalent,
             payment_method_name, notes
      FROM payments WHERE customer_id = $1 AND sale_id IS NOT NULL
      ORDER BY payment_date DESC, created_at DESC
    `, [id]);
    const n = (v) => Number(v) || 0;
    res.json({
      cliente: c[0],
      ventas: ventas.map((v) => ({ ...v, total: n(v.total), paid_amount: n(v.paid_amount), saldo: n(v.saldo) })),
      cobros: cobros.map((p) => ({ ...p, amount: n(p.amount), amount_uyu_equivalent: n(p.amount_uyu_equivalent) })),
    });
  } catch (err) {
    console.error("Customer detail error:", err);
    res.status(500).json({ error: "Error al cargar el cliente" });
  }
});

// GET /api/credit/sales/:id — una venta a credito con sus cobros
router.get("/sales/:id", async (req, res) => {
  try {
    const v = await ventaCompleta(req.params.id);
    if (!v) return res.status(404).json({ error: "Venta no encontrada" });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
