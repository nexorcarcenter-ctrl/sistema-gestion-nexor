const router = require("express").Router();
const pool = require("../db");
const permisos = require("../permissions");

/**
 * Compra directa.
 *
 * Registrar una compra hace cuatro cosas que tienen que pasar juntas o
 * ninguna: suma el stock, actualiza el costo de cada producto, anota el gasto
 * y actualiza los totales del proveedor. Por eso todo va en una transaccion y
 * nada de esto se escribe desde la API generica de entidades.
 */

router.use((req, res, next) => {
  if (!permisos.puede(req.user?.role, "gestionarCompras")) {
    return res.status(403).json({ error: "No tenés permisos para gestionar compras" });
  }
  next();
});

const MONEDAS = ["UYU", "USD"];
const TASAS_IVA = [0, 10, 22];
const CATEGORIA_GASTO = "Compra de mercadería";
const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Valida y normaliza lo que manda el formulario. Los totales se recalculan
// aca: no se confia en los que calcula la pantalla.
function leerCompra(body) {
  const errores = [];
  const moneda = MONEDAS.includes(body.currency) ? body.currency : "UYU";
  const tc = moneda === "USD" ? Number(body.exchange_rate) : 1;
  const iva = Number(body.tax_rate) || 0;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(body.order_date || "") ? body.order_date : null;

  if (!body.supplier_id) errores.push("Elegí el proveedor");
  if (moneda === "USD" && !(tc > 0)) errores.push("Poné el tipo de cambio");
  if (!TASAS_IVA.includes(iva)) errores.push("IVA inválido");
  if (!fecha) errores.push("Fecha inválida");

  const items = (Array.isArray(body.items) ? body.items : []).map((i) => ({
    product_id: i.product_id,
    quantity: Number(i.quantity),
    unit_cost: redondear(i.unit_cost),
  }));
  if (items.length === 0) errores.push("Agregá al menos un producto");
  if (items.some((i) => !i.product_id)) errores.push("Hay un producto sin identificar");
  if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0)) errores.push("Las cantidades tienen que ser enteros mayores a cero");
  if (items.some((i) => i.unit_cost < 0)) errores.push("Hay un costo negativo");
  if (new Set(items.map((i) => i.product_id)).size !== items.length) errores.push("Hay un producto repetido");

  return {
    errores,
    compra: {
      supplier_id: body.supplier_id,
      order_date: fecha,
      currency: moneda,
      exchange_rate: moneda === "USD" ? tc : 1,
      tax_rate: iva,
      payment_method_id: body.payment_method_id || null,
      invoice_number: (body.invoice_number || "").trim() || null,
      notes: (body.notes || "").trim() || null,
      items,
    },
  };
}

// El numero se calcula con un lock para que dos compras simultaneas no
// salgan con el mismo PO-000123
async function siguienteNumero(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('purchase_order_number'))");
  const { rows } = await client.query(`
    SELECT COALESCE(MAX(NULLIF(regexp_replace(po_number, '^PO-', ''), '')::int), 0) AS ultimo
    FROM purchase_orders WHERE po_number ~ '^PO-[0-9]+$'
  `);
  return `PO-${String(Number(rows[0].ultimo) + 1).padStart(6, "0")}`;
}

// Mismo registro que deja routes/stock.js, para que Movimientos de Stock
// muestre las compras igual que cualquier otro movimiento
async function moverStock(client, producto, cantidad, tipo, numero, motivo) {
  const anterior = Number(producto.stock_quantity) || 0;
  const nuevo = Math.max(0, anterior + cantidad);
  // Se registra lo que de verdad se movio: si no alcanzaba el stock, el
  // movimiento tiene que decirlo en lugar de mostrar una resta que no paso
  const aplicado = nuevo - anterior;
  const nota = aplicado !== cantidad ? ` (se pedía ${cantidad}, había ${anterior})` : "";
  await client.query("UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2", [nuevo, producto.id]);
  await client.query(
    `INSERT INTO stock_movements (product_id, product_name, sku, movement_type, quantity, previous_stock, new_stock, reference_type, reference_number, reason, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'purchase_order', $8, $9, NOW(), NOW())`,
    [producto.id, producto.name, producto.sku || "", tipo, aplicado, anterior, nuevo, numero, motivo + nota]
  );
  producto.stock_quantity = nuevo;
}

// Carga el stock, los costos y las lineas de una compra.
//
// anterior sirve al editar: por producto, cuanto habia sumado la version
// vieja y que costo tenia antes de esa compra. Se mueve solo la diferencia:
// deshacer todo y volver a sumar pasaria por cero si ya se vendio parte, y
// como el stock no baja de cero, el resultado final quedaria mal.
async function aplicarItems(client, orden, compra, proveedor, anterior = {}) {
  const ids = compra.items.map((i) => i.product_id);
  const { rows: productos } = await client.query(
    "SELECT id, name, sku, stock_quantity, cost_price FROM products WHERE id::text = ANY($1) FOR UPDATE",
    [ids]
  );
  const porId = Object.fromEntries(productos.map((p) => [String(p.id), p]));
  const faltan = ids.filter((id) => !porId[id]);
  if (faltan.length) {
    const err = new Error("Algún producto de la compra ya no existe");
    err.status = 400;
    throw err;
  }

  const lineas = [];
  for (const item of compra.items) {
    const p = porId[item.product_id];
    const costoUyu = redondear(item.unit_cost * compra.exchange_rate);
    const total = redondear(item.quantity * item.unit_cost);

    const previo = anterior[String(p.id)];
    const diferencia = item.quantity - (previo?.cantidad || 0);
    if (diferencia !== 0) {
      const motivo = previo ? `Corrección de compra a ${proveedor.name}` : `Compra a ${proveedor.name}`;
      await moverStock(client, p, diferencia, diferencia > 0 ? "purchase" : "purchase_reversal", orden.po_number, motivo);
    }
    // El costo "de antes" es el que tenia el producto antes de la compra
    // original, no el que le puso la version que se esta corrigiendo
    const costoPrevio = previo ? previo.costoPrevio : p.cost_price;
    await client.query("UPDATE products SET cost_price = $1, updated_at = NOW() WHERE id = $2", [costoUyu, p.id]);

    await client.query(
      `INSERT INTO purchase_order_items
         (purchase_order_id, supplier_id, supplier_name, product_id, product_name, sku, quantity,
          unit_cost, currency, unit_cost_uyu, total, previous_cost_price, purchase_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [orden.id, proveedor.id, proveedor.name, p.id, p.name, p.sku || "", item.quantity,
       item.unit_cost, compra.currency, costoUyu, total, costoPrevio, compra.order_date]
    );
    lineas.push({ product_id: String(p.id), product_name: p.name, sku: p.sku || "", quantity: item.quantity, unit_cost: item.unit_cost, total });
  }
  return lineas;
}

// Deshace el efecto de una compra en stock y costos. El costo solo se repone
// si nadie lo cambio despues: pisar un ajuste manual seria peor que dejarlo.
//
// Al editar se pasa quedan: los productos que siguen en la compra no se
// tocan aca (aplicarItems mueve solo la diferencia) y se devuelve lo que
// habia de cada uno. Los que se sacaron de la compra si se descuentan.
async function revertirItems(client, orden, motivo, quedan = []) {
  const { rows: items } = await client.query("SELECT * FROM purchase_order_items WHERE purchase_order_id = $1", [orden.id]);
  const siguen = new Set(quedan.map((i) => String(i.product_id)));
  const anterior = {};
  for (const item of items) {
    if (siguen.has(String(item.product_id))) {
      const a = anterior[item.product_id] ||= { cantidad: 0, costoPrevio: item.previous_cost_price };
      a.cantidad += Number(item.quantity);
      continue;
    }
    const { rows } = await client.query(
      "SELECT id, name, sku, stock_quantity, cost_price FROM products WHERE id::text = $1 FOR UPDATE",
      [item.product_id]
    );
    const p = rows[0];
    if (!p) continue;
    await moverStock(client, p, -Number(item.quantity), "purchase_reversal", orden.po_number, motivo);
    const sigueIgual = redondear(p.cost_price) === redondear(item.unit_cost_uyu);
    if (sigueIgual && item.previous_cost_price != null) {
      await client.query("UPDATE products SET cost_price = $1, updated_at = NOW() WHERE id = $2", [item.previous_cost_price, p.id]);
    }
  }
  await client.query("DELETE FROM purchase_order_items WHERE purchase_order_id = $1", [orden.id]);
  return anterior;
}

// Antes de deshacer una compra: ¿alguna de esas unidades ya se vendio? Si
// tenia 3, compre 5 y vendi 7, anular la compra pediria restar 5 de 1. El
// stock no puede quedar negativo, asi que sin este chequeo quedaria en 0 y
// nadie se enteraria de que faltan 4. nuevos es la version corregida al
// editar; al anular va vacio.
async function unidadesYaVendidas(client, orden, nuevos = []) {
  const { rows } = await client.query(`
    SELECT i.product_id, MAX(i.product_name) AS product_name, SUM(i.quantity) AS cantidad,
           MAX(p.stock_quantity) AS stock
    FROM purchase_order_items i
    JOIN products p ON p.id::text = i.product_id
    WHERE i.purchase_order_id = $1
    GROUP BY i.product_id
  `, [String(orden.id)]);
  const nuevaCantidad = Object.fromEntries(nuevos.map((i) => [String(i.product_id), i.quantity]));
  return rows
    .map((r) => {
      const queda = (Number(r.stock) || 0) - Number(r.cantidad) + (nuevaCantidad[r.product_id] || 0);
      return { product_id: r.product_id, product_name: r.product_name, stock: Number(r.stock) || 0, faltan: -queda };
    })
    .filter((r) => r.faltan > 0);
}

function frenarSiYaSeVendio(faltantes, confirmado) {
  if (!faltantes.length || confirmado) return;
  const err = new Error("Parte de esta compra ya se vendió: el stock no alcanza para descontarla");
  err.status = 409;
  err.extra = { codigo: "stock_insuficiente", faltantes };
  throw err;
}

// Crea o actualiza el gasto que representa la compra
async function guardarGasto(client, orden, fecha, usuario) {
  const descripcion = `Compra ${orden.po_number} a ${orden.supplier_name}`;
  const valores = [
    fecha, CATEGORIA_GASTO, descripcion, orden.total, orden.currency, orden.exchange_rate,
    orden.total_uyu, orden.payment_method_id, orden.payment_method_name, orden.supplier_name,
    orden.invoice_number ? `Factura ${orden.invoice_number}` : null,
  ];
  if (orden.expense_id) {
    const { rowCount } = await client.query(
      `UPDATE expenses SET expense_date=$1, category_name=$2, description=$3, amount=$4, currency=$5,
         exchange_rate=$6, amount_uyu=$7, payment_method_id=$8, payment_method_name=$9, supplier_name=$10,
         notes=$11, updated_at=NOW()
       WHERE id = $12`,
      [...valores, orden.expense_id]
    );
    if (rowCount) return orden.expense_id;
  }
  const { rows } = await client.query(
    `INSERT INTO expenses (expense_date, category_name, description, amount, currency, exchange_rate,
       amount_uyu, payment_method_id, payment_method_name, supplier_name, notes,
       expense_type, purchase_order_id, is_fixed, created_by, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'compra',$12,false,$13,$14) RETURNING id`,
    [...valores, orden.id, usuario.id, usuario.nombre]
  );
  return rows[0].id;
}

// Totales del proveedor, recalculados desde las compras en lugar de sumar y
// restar: asi una edicion o anulacion nunca los deja desfasados
async function recalcularProveedor(client, supplierId) {
  if (!supplierId) return;
  await client.query(`
    UPDATE suppliers SET
      total_orders = (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = $1 AND status = 'received'),
      total_spent  = (SELECT COALESCE(SUM(total_uyu), 0) FROM purchase_orders WHERE supplier_id = $1 AND status = 'received'),
      updated_at = NOW()
    WHERE id::text = $1
  `, [String(supplierId)]);
}

async function datosUsuario(req) {
  const { rows } = await pool.query("SELECT full_name FROM users WHERE id = $1", [req.user.id]);
  return { id: String(req.user.id), nombre: rows[0]?.full_name || req.user.username || "" };
}

async function cargarReferencias(client, compra) {
  const { rows: prov } = await client.query("SELECT id, name FROM suppliers WHERE id::text = $1", [compra.supplier_id]);
  if (!prov[0]) {
    const err = new Error("El proveedor no existe");
    err.status = 400;
    throw err;
  }
  let metodo = null;
  if (compra.payment_method_id) {
    const { rows } = await client.query("SELECT id, name FROM payment_methods WHERE id::text = $1", [compra.payment_method_id]);
    metodo = rows[0] || null;
  }
  return { proveedor: prov[0], metodo };
}

function totalesDe(compra) {
  const subtotal = redondear(compra.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0));
  const iva = redondear(subtotal * compra.tax_rate / 100);
  const total = redondear(subtotal + iva);
  return { subtotal, iva, total, total_uyu: redondear(total * compra.exchange_rate) };
}

// Compras del sistema anterior que ya sumaron stock sin dejar lineas en
// purchase_order_items: editarlas o anularlas descuadraria el stock
async function esCompraVieja(client, orden) {
  if (orden.status !== "received") return false;
  const { rows } = await client.query("SELECT 1 FROM purchase_order_items WHERE purchase_order_id = $1 LIMIT 1", [orden.id]);
  return rows.length === 0;
}

async function enTransaccion(res, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (err) {
    await client.query("ROLLBACK");
    if (!err.status) console.error("Purchases error:", err);
    res.status(err.status || 500).json({ error: err.status ? err.message : "Error al guardar la compra", ...(err.extra || {}) });
    return undefined;
  } finally {
    client.release();
  }
}

function fallar(status, mensaje) {
  const err = new Error(mensaje);
  err.status = status;
  throw err;
}

async function ordenCompleta(id) {
  const { rows } = await pool.query("SELECT * FROM purchase_orders WHERE id::text = $1", [id]);
  if (!rows[0]) return null;
  const { rows: items } = await pool.query(
    "SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at, product_name",
    [id]
  );
  return { ...rows[0], items };
}

// La compra ya quedo guardada: si falla solo la relectura, se avisa igual
async function responderOrden(res, id, status = 200) {
  try {
    res.status(status).json(await ordenCompleta(id));
  } catch (err) {
    res.status(status).json({ id });
  }
}

// POST /api/purchases — registrar una compra
router.post("/", async (req, res) => {
  const { errores, compra } = leerCompra(req.body);
  if (errores.length) return res.status(400).json({ error: errores[0] });
  const usuario = await datosUsuario(req);

  const id = await enTransaccion(res, async (client) => {
    const { proveedor, metodo } = await cargarReferencias(client, compra);
    const t = totalesDe(compra);
    const numero = await siguienteNumero(client);

    const { rows } = await client.query(
      `INSERT INTO purchase_orders (po_number, order_date, received_date, supplier_id, supplier_name,
         currency, exchange_rate, tax_rate, subtotal, tax_amount, total, total_uyu,
         payment_method_id, payment_method_name, invoice_number, notes, status, payment_status,
         created_by, created_by_name)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'received','paid',$16,$17)
       RETURNING *`,
      [numero, compra.order_date, proveedor.id, proveedor.name, compra.currency, compra.exchange_rate,
       compra.tax_rate, t.subtotal, t.iva, t.total, t.total_uyu, metodo?.id || null, metodo?.name || null,
       compra.invoice_number, compra.notes, usuario.id, usuario.nombre]
    );
    const orden = rows[0];
    const lineas = await aplicarItems(client, orden, compra, proveedor);
    const gasto = await guardarGasto(client, orden, compra.order_date, usuario);
    await client.query(
      "UPDATE purchase_orders SET items_json = $1, items_count = $2, expense_id = $3 WHERE id = $4",
      [JSON.stringify(lineas), lineas.reduce((s, l) => s + l.quantity, 0), gasto, orden.id]
    );
    await recalcularProveedor(client, proveedor.id);
    return orden.id;
  });
  if (id) responderOrden(res, id, 201);
});

// PUT /api/purchases/:id — corregir una compra ya registrada. Se deshace la
// version anterior y se aplica la nueva, asi el stock queda como si se hubiera
// cargado bien desde el principio.
router.put("/:id", async (req, res) => {
  const { errores, compra } = leerCompra(req.body);
  if (errores.length) return res.status(400).json({ error: errores[0] });
  const usuario = await datosUsuario(req);

  const id = await enTransaccion(res, async (client) => {
    const { rows } = await client.query("SELECT * FROM purchase_orders WHERE id::text = $1 FOR UPDATE", [req.params.id]);
    const anterior = rows[0];
    if (!anterior) fallar(404, "Compra no encontrada");
    if (anterior.status === "cancelled") fallar(409, "La compra está anulada");
    if (await esCompraVieja(client, anterior)) fallar(409, "Esta compra es del sistema anterior y no se puede editar");

    const { proveedor, metodo } = await cargarReferencias(client, compra);
    frenarSiYaSeVendio(await unidadesYaVendidas(client, anterior, compra.items), req.body.confirmar_stock === true);
    const previos = await revertirItems(client, anterior, `Corrección de ${anterior.po_number}`, compra.items);
    const t = totalesDe(compra);

    const { rows: act } = await client.query(
      `UPDATE purchase_orders SET order_date=$1, received_date=$1, supplier_id=$2, supplier_name=$3,
         currency=$4, exchange_rate=$5, tax_rate=$6, subtotal=$7, tax_amount=$8, total=$9, total_uyu=$10,
         payment_method_id=$11, payment_method_name=$12, invoice_number=$13, notes=$14,
         status='received', payment_status='paid', updated_at=NOW()
       WHERE id = $15 RETURNING *`,
      [compra.order_date, proveedor.id, proveedor.name, compra.currency, compra.exchange_rate, compra.tax_rate,
       t.subtotal, t.iva, t.total, t.total_uyu, metodo?.id || null, metodo?.name || null,
       compra.invoice_number, compra.notes, anterior.id]
    );
    const orden = act[0];
    const lineas = await aplicarItems(client, orden, compra, proveedor, previos);
    const gasto = await guardarGasto(client, orden, compra.order_date, usuario);
    await client.query(
      "UPDATE purchase_orders SET items_json = $1, items_count = $2, expense_id = $3 WHERE id = $4",
      [JSON.stringify(lineas), lineas.reduce((s, l) => s + l.quantity, 0), gasto, orden.id]
    );
    await recalcularProveedor(client, proveedor.id);
    if (String(anterior.supplier_id) !== String(proveedor.id)) await recalcularProveedor(client, anterior.supplier_id);
    return orden.id;
  });
  if (id) responderOrden(res, id);
});

// POST /api/purchases/:id/cancel — anular: devuelve el stock, repone costos y
// borra el gasto. La compra queda visible como anulada, no desaparece.
router.post("/:id/cancel", async (req, res) => {
  const id = await enTransaccion(res, async (client) => {
    const { rows } = await client.query("SELECT * FROM purchase_orders WHERE id::text = $1 FOR UPDATE", [req.params.id]);
    const orden = rows[0];
    if (!orden) fallar(404, "Compra no encontrada");
    if (orden.status === "cancelled") fallar(409, "La compra ya estaba anulada");
    if (await esCompraVieja(client, orden)) fallar(409, "Esta compra es del sistema anterior y no se puede anular");

    frenarSiYaSeVendio(await unidadesYaVendidas(client, orden), req.body?.confirmar_stock === true);
    await revertirItems(client, orden, `Anulación de ${orden.po_number}`);
    await client.query("DELETE FROM expenses WHERE purchase_order_id = $1", [String(orden.id)]);
    await client.query(
      "UPDATE purchase_orders SET status = 'cancelled', expense_id = NULL, updated_at = NOW() WHERE id = $1",
      [orden.id]
    );
    await recalcularProveedor(client, orden.supplier_id);
    return orden.id;
  });
  if (id) responderOrden(res, id);
});

// DELETE /api/purchases/:id — solo para borradores del sistema anterior, que
// nunca tocaron el stock. Una compra registrada se anula, no se borra.
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM purchase_orders WHERE id::text = $1 AND status IN ('draft', 'sent', 'confirmed')",
      [req.params.id]
    );
    if (!rowCount) return res.status(409).json({ error: "Solo se pueden borrar pedidos que nunca se recibieron. Las compras se anulan." });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchases/prices?product_id= — ultimo precio de cada proveedor
// por producto, en pesos. Se ordena por el ultimo precio y no por el minimo
// historico: lo que importa es a quien conviene comprarle hoy.
router.get("/prices", async (req, res) => {
  try {
    const params = [];
    let filtro = "";
    if (req.query.product_id) {
      params.push(String(req.query.product_id));
      filtro = `AND i.product_id = $${params.length}`;
    }
    const { rows } = await pool.query(`
      WITH lineas AS (
        SELECT i.*, o.po_number, o.status,
               ROW_NUMBER() OVER (PARTITION BY i.product_id, i.supplier_id
                                  ORDER BY i.purchase_date DESC, i.created_at DESC) AS orden
        FROM purchase_order_items i
        JOIN purchase_orders o ON o.id::text = i.purchase_order_id
        -- A un proveedor archivado ya no se le compra: recomendarlo como el
        -- mas barato no sirve de nada
        JOIN suppliers s ON s.id::text = i.supplier_id AND s.is_active IS NOT FALSE
        WHERE o.status = 'received' ${filtro}
      )
      SELECT product_id, supplier_id,
             MAX(product_name)  FILTER (WHERE orden = 1) AS product_name,
             MAX(sku)           FILTER (WHERE orden = 1) AS sku,
             MAX(supplier_name) FILTER (WHERE orden = 1) AS supplier_name,
             MAX(unit_cost_uyu) FILTER (WHERE orden = 1) AS ultimo_costo_uyu,
             MAX(unit_cost)     FILTER (WHERE orden = 1) AS ultimo_costo,
             MAX(currency)      FILTER (WHERE orden = 1) AS ultima_moneda,
             MAX(purchase_date) FILTER (WHERE orden = 1) AS ultima_fecha,
             MIN(unit_cost_uyu) AS minimo_costo_uyu,
             COUNT(*)           AS compras,
             SUM(quantity)      AS unidades
      FROM lineas
      GROUP BY product_id, supplier_id
    `, params);

    const productos = {};
    for (const r of rows) {
      const p = productos[r.product_id] ||= { product_id: r.product_id, product_name: r.product_name, sku: r.sku, proveedores: [] };
      p.proveedores.push({
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        ultimo_costo_uyu: Number(r.ultimo_costo_uyu) || 0,
        ultimo_costo: Number(r.ultimo_costo) || 0,
        ultima_moneda: r.ultima_moneda,
        ultima_fecha: r.ultima_fecha,
        minimo_costo_uyu: Number(r.minimo_costo_uyu) || 0,
        compras: Number(r.compras) || 0,
        unidades: Number(r.unidades) || 0,
      });
    }
    const lista = Object.values(productos).map((p) => {
      p.proveedores.sort((a, b) => a.ultimo_costo_uyu - b.ultimo_costo_uyu);
      return p;
    });
    lista.sort((a, b) => (a.product_name || "").localeCompare(b.product_name || ""));
    res.json(lista);
  } catch (err) {
    console.error("Purchases prices error:", err);
    res.status(500).json({ error: "Error al comparar precios" });
  }
});

// GET /api/purchases/supplier/:id — historial de un proveedor: sus compras y
// que productos se le compraron
router.get("/supplier/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows: compras } = await pool.query(`
      SELECT id, po_number, order_date, status, currency, total, total_uyu, payment_method_name, items_count, invoice_number
      FROM purchase_orders WHERE supplier_id = $1
      ORDER BY order_date DESC NULLS LAST, created_at DESC
    `, [id]);
    const { rows: productos } = await pool.query(`
      SELECT i.product_id,
             MAX(i.product_name) AS product_name,
             MAX(i.sku) AS sku,
             SUM(i.quantity) AS unidades,
             COUNT(*) AS compras,
             (ARRAY_AGG(i.unit_cost ORDER BY i.purchase_date DESC, i.created_at DESC))[1] AS ultimo_costo,
             (ARRAY_AGG(i.currency ORDER BY i.purchase_date DESC, i.created_at DESC))[1] AS ultima_moneda,
             (ARRAY_AGG(i.unit_cost_uyu ORDER BY i.purchase_date DESC, i.created_at DESC))[1] AS ultimo_costo_uyu,
             MAX(i.purchase_date) AS ultima_fecha
      FROM purchase_order_items i
      JOIN purchase_orders o ON o.id::text = i.purchase_order_id
      WHERE i.supplier_id = $1 AND o.status = 'received'
      GROUP BY i.product_id
      ORDER BY MAX(i.purchase_date) DESC
    `, [id]);
    const n = (v) => Number(v) || 0;
    res.json({
      compras: compras.map((c) => ({ ...c, total: n(c.total), total_uyu: n(c.total_uyu) })),
      productos: productos.map((p) => ({
        ...p, unidades: n(p.unidades), compras: n(p.compras),
        ultimo_costo: n(p.ultimo_costo), ultimo_costo_uyu: n(p.ultimo_costo_uyu),
      })),
    });
  } catch (err) {
    console.error("Purchases supplier error:", err);
    res.status(500).json({ error: "Error al cargar el historial del proveedor" });
  }
});

// GET /api/purchases/:id — una compra con sus lineas
router.get("/:id", async (req, res) => {
  try {
    const orden = await ordenCompleta(req.params.id);
    if (!orden) return res.status(404).json({ error: "Compra no encontrada" });
    res.json(orden);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
