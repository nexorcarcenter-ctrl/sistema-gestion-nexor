const router = require("express").Router();
const {
  redondear, fallar, enTransaccion, datosUsuario, siguienteNumeroVenta,
  leerItems, descontarStock, leerMedioDePago, cajaAbierta,
} = require("../lib/ventas");

/**
 * Venta directa de contado.
 *
 * Antes la pantalla guardaba la venta, el stock y el contador de la caja en
 * pedidos separados, y no dejaba ningun pago registrado: como la caja arma
 * el arqueo desde la tabla payments, las ventas directas no aparecian en el
 * arqueo. Ahora todo va en una transaccion y cada forma de pago queda como
 * un pago de la caja, igual que los cobros de las ordenes de servicio.
 */

// POST /api/sales/direct
router.post("/direct", async (req, res) => {
  const b = req.body || {};
  const usuario = await datosUsuario(req);

  const id = await enTransaccion(res, async (client) => {
    const caja = await cajaAbierta(client, b.cash_register_id);
    if (!caja) fallar(409, "No hay caja abierta: abrila antes de registrar una venta");

    const lineas = leerItems(b.items);
    const total = redondear(lineas.reduce((s, i) => s + i.total, 0));
    const pagos = [];
    for (const p of (Array.isArray(b.pagos) ? b.pagos : [])) pagos.push(await leerMedioDePago(client, p));
    const cobrado = redondear(pagos.reduce((s, p) => s + p.enPesos, 0));
    if (cobrado < total - 0.009) fallar(400, `Falta cobrar $${redondear(total - cobrado)}`);
    // Lo que se entrego de mas vuelve en efectivo, en pesos
    const vuelto = redondear(cobrado - total);

    const numero = await siguienteNumeroVenta(client);
    const pagosJson = pagos.map((p) => ({
      method_id: String(p.metodo.id), method_name: p.metodo.name, type: p.metodo.type,
      currency: p.moneda, amount: p.monto, exchange_rate: p.tc, amount_uyu: p.enPesos,
    }));
    // En el detalle de la venta el vuelto se descuenta del efectivo en pesos:
    // asi "formas de pago" en Reportes suma lo que realmente quedo
    if (vuelto > 0.009) {
      const efectivo = pagosJson.find((p) => p.type === "cash" && p.currency === "UYU" && p.amount >= vuelto);
      if (efectivo) {
        efectivo.amount = redondear(efectivo.amount - vuelto);
        efectivo.amount_uyu = efectivo.amount;
        efectivo.vuelto = vuelto;
      } else {
        pagosJson.push({ method_id: null, method_name: "Vuelto", type: "cash", currency: "UYU", amount: -vuelto, exchange_rate: 1, amount_uyu: -vuelto });
      }
    }
    const dolares = redondear(pagos.filter((p) => p.moneda === "USD").reduce((s, p) => s + p.monto, 0));
    const { rows: [venta] } = await client.query(
      `INSERT INTO sales (sale_number, sale_date, sale_type, customer_name, customer_phone, vehicle, items_json, items_count,
         payments_json, total_uyu, total_usd, total, subtotal, payment_type, paid_amount, payment_status, status,
         cash_register_id, notes, cashier)
       VALUES ($1, NOW(), 'direct', $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, 'contado', $10, 'paid', 'completed', $11, $12, $13)
       RETURNING *`,
      [numero, (b.customer_name || "").trim(), (b.customer_phone || "").trim(), (b.vehicle || "").trim(),
       JSON.stringify(lineas), lineas.length, JSON.stringify(pagosJson), cobrado, dolares, total, caja,
       (b.notes || "").trim() || null, usuario.nombre]
    );

    await descontarStock(client, lineas, numero, "Venta directa");

    // Un pago de la caja por cada forma de pago, como hacen las ordenes
    const insertar = (monto, moneda, tipo, metodoId, metodoNombre, tc, enPesos, nota) => client.query(
      `INSERT INTO payments (sale_id, order_number, cash_register_id, customer_name, amount, currency, payment_method,
         payment_method_id, payment_method_name, exchange_rate, amount_uyu_equivalent, paid_at, payment_date, notes,
         created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()::text,(NOW() AT TIME ZONE 'America/Montevideo')::date,$12,$13,$14)`,
      [String(venta.id), numero, caja, venta.customer_name || null, monto, moneda, tipo, metodoId, metodoNombre,
       tc, enPesos, nota, usuario.id, usuario.nombre]
    );
    for (const p of pagos) {
      await insertar(p.monto, p.moneda, p.metodo.type, String(p.metodo.id), p.metodo.name, p.tc, p.enPesos, "Venta directa");
    }
    // El vuelto sale del efectivo en pesos: se registra en negativo para que
    // el arqueo espere lo que de verdad queda en la caja
    if (vuelto > 0.009) {
      await insertar(-vuelto, "UYU", "cash", null, "Vuelto", 1, -vuelto, `Vuelto de ${numero}`);
    }

    // Contador de la caja, sumado en la base y no desde una copia de la pantalla
    const pesos = redondear(pagos.filter((p) => p.moneda === "UYU").reduce((s, p) => s + p.monto, 0));
    const dolaresEnPesos = redondear(pagos.filter((p) => p.moneda === "USD").reduce((s, p) => s + p.enPesos, 0));
    await client.query(
      "UPDATE cash_registers SET total_uyu = COALESCE(total_uyu, 0) + $1, total_usd = COALESCE(total_usd, 0) + $2, updated_at = NOW() WHERE id::text = $3",
      [redondear(pesos + dolaresEnPesos - vuelto), dolares, caja]
    );
    return venta;
  }, "Sales");
  if (id) res.status(201).json(id);
});

module.exports = router;
