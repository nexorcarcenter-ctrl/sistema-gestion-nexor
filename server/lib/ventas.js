const pool = require("../db");

/**
 * Piezas comunes a las ventas directas (de contado y a credito): numero de
 * venta, stock, formas de pago y transacciones.
 */

const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Fecha de hoy en Uruguay: el servidor corre en UTC y despues de las 21 hs
// ya seria "mañana"
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Montevideo" });

function fallar(status, mensaje, extra) {
  const err = new Error(mensaje);
  err.status = status;
  err.extra = extra;
  throw err;
}

async function enTransaccion(res, fn, etiqueta = "Ventas") {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch (err) {
    await client.query("ROLLBACK");
    if (!err.status) console.error(`${etiqueta} error:`, err);
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

// Mismo formato que sequence.js (V-000123), pero con lock: dos ventas a la
// vez no pueden salir con el mismo numero
async function siguienteNumeroVenta(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('sale_number'))");
  const { rows } = await client.query(`
    SELECT COALESCE(MAX(NULLIF(regexp_replace(sale_number, '^V-', ''), '')::int), 0) AS ultimo
    FROM sales WHERE sale_number ~ '^V-[0-9]+$'
  `);
  return `V-${String(Number(rows[0].ultimo) + 1).padStart(6, "0")}`;
}

// Valida los items que manda la pantalla
function leerItems(lista) {
  const items = (Array.isArray(lista) ? lista : []).map((i) => ({
    product_id: i.product_id ? String(i.product_id) : "",
    product_name: (i.product_name || "").trim(),
    sku: i.sku || "",
    quantity: Number(i.quantity),
    unit_price: redondear(i.unit_price),
  }));
  if (!items.length) fallar(400, "Agregá al menos un producto");
  if (items.some((i) => !i.product_name)) fallar(400, "Hay un ítem sin descripción");
  if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0)) fallar(400, "Las cantidades tienen que ser enteros mayores a cero");
  if (items.some((i) => i.unit_price < 0)) fallar(400, "Hay un precio negativo");
  return items.map((i) => ({ ...i, total: redondear(i.quantity * i.unit_price) }));
}

// Descuenta el stock de lo vendido, con el mismo registro que routes/stock.js
async function descontarStock(client, lineas, numero, motivo) {
  for (const i of lineas.filter((l) => l.product_id)) {
    const { rows } = await client.query("SELECT id, name, sku, stock_quantity FROM products WHERE id::text = $1 FOR UPDATE", [i.product_id]);
    const p = rows[0];
    if (!p) fallar(400, `El producto ${i.product_name} ya no existe`);
    const anterior = Number(p.stock_quantity) || 0;
    const nuevo = Math.max(0, anterior - i.quantity);
    await client.query("UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2", [nuevo, p.id]);
    await client.query(
      `INSERT INTO stock_movements (product_id, product_name, sku, movement_type, quantity, previous_stock, new_stock,
         reference_type, reference_number, reason, created_at, updated_at)
       VALUES ($1,$2,$3,'sale',$4,$5,$6,'sale',$7,$8,NOW(),NOW())`,
      [p.id, p.name, p.sku || "", nuevo - anterior, anterior, nuevo, numero, motivo]
    );
  }
}

// Una forma de pago de la base con su monto pasado a pesos
async function leerMedioDePago(client, pago) {
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
  return { metodo, moneda, tc, monto, enPesos: redondear(monto * tc) };
}

async function cajaAbierta(client, cajaId) {
  if (!cajaId) return null;
  const { rows } = await client.query("SELECT id FROM cash_registers WHERE id::text = $1 AND status = 'open'", [String(cajaId)]);
  return rows[0] ? String(rows[0].id) : null;
}

module.exports = {
  redondear, hoy, fallar, enTransaccion, datosUsuario, siguienteNumeroVenta,
  leerItems, descontarStock, leerMedioDePago, cajaAbierta,
};
