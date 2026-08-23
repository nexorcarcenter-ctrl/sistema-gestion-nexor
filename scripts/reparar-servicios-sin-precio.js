/**
 * Repara ordenes de servicio que quedaron con sale_price en 0 pese a haberse cobrado.
 *
 * El precio real se toma de la venta asociada (sales.total, que es lo cobrado
 * convertido a pesos). Solo se tocan las ordenes donde ese importe se puede
 * atribuir sin ambiguedad: un unico servicio sin precio y ningun otro servicio
 * ya cobrado en la misma orden. Si hay mas de una forma de repartir la plata,
 * se informa y no se toca.
 *
 * Uso:
 *   node scripts/reparar-servicios-sin-precio.js              (simula, no escribe)
 *   node scripts/reparar-servicios-sin-precio.js --aplicar    (escribe)
 */
require("dotenv").config();
const { Pool } = require("pg");

const APLICAR = process.argv.includes("--aplicar");
// DATABASE_PUBLIC_URL tiene prioridad: es la unica que resuelve desde fuera de
// Railway. Permite correr esto con `railway run --service Postgres`.
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL o DATABASE_PUBLIC_URL"); process.exit(1); }

const esLocal = url.includes("localhost") || url.includes("127.0.0.1");
const pool = new Pool({ connectionString: url, ssl: esLocal ? false : { rejectUnauthorized: false } });

const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-UY")}`;
const parse = (v) => { try { return JSON.parse(v || "[]"); } catch { return []; } };

(async () => {
  const { rows } = await pool.query(`
    SELECT so.id, so.order_number, so.services, so.total_sale,
           s.id AS sale_id, s.sale_number, s.total AS cobrado, s.items_json
    FROM service_orders so
    JOIN sales s ON s.service_order_id = so.id::text AND s.status = 'completed'
    WHERE so.services NOT IN ('', '[]')
    ORDER BY so.order_number
  `);

  console.log(APLICAR ? "=== APLICANDO CAMBIOS ===\n" : "=== SIMULACION (no escribe nada) ===\n");

  let reparadas = 0, omitidas = 0;

  for (const r of rows) {
    const servicios = parse(r.services);
    const sinPrecio = servicios.filter((s) => !(Number(s.sale_price) > 0));
    if (sinPrecio.length === 0) continue;

    const yaCobrado = servicios.reduce((a, s) => a + (Number(s.sale_price) || 0), 0);
    const disponible = Number(r.cobrado) - yaCobrado;

    if (sinPrecio.length > 1) {
      console.log(`OMITIDA  ${r.order_number}: ${sinPrecio.length} servicios sin precio, no se puede repartir ${fmt(disponible)} automaticamente`);
      omitidas++; continue;
    }
    if (disponible <= 0) {
      console.log(`OMITIDA  ${r.order_number}: la venta (${fmt(r.cobrado)}) ya esta cubierta por los servicios con precio. "${sinPrecio[0].service_name}" fue sin cargo.`);
      omitidas++; continue;
    }

    const actualizados = servicios.map((s) =>
      s === sinPrecio[0]
        ? { ...s, sale_price: disponible, labor_cost: Number(s.labor_cost) || disponible }
        : s
    );
    const nuevoTotal = actualizados.reduce((a, s) => a + (Number(s.sale_price) || 0), 0);
    const nuevoCosto = actualizados.reduce((a, s) =>
      a + (s.products || []).reduce((x, p) => x + (Number(p.cost_price) || 0) * (Number(p.quantity) || 1), 0), 0);

    // El detalle de la venta se reconstruye igual que lo hace PaymentDialog
    const items = actualizados.flatMap((svc) => {
      const out = [];
      if (Number(svc.sale_price) > 0) {
        out.push({
          product_id: svc.service_type_id || "",
          product_name: svc.service_name,
          quantity: 1,
          unit_price: Number(svc.sale_price),
          total: Number(svc.sale_price),
        });
      }
      (svc.products || []).forEach((p) => out.push({
        product_id: p.product_id || "",
        product_name: p.product_name,
        quantity: p.quantity || 1,
        unit_price: Number(p.cost_price) || 0,
        total: (Number(p.cost_price) || 0) * (Number(p.quantity) || 1),
      }));
      return out;
    });

    console.log(`REPARA   ${r.order_number} / ${r.sale_number}`);
    console.log(`         servicio "${sinPrecio[0].service_name}": ${fmt(0)} -> ${fmt(disponible)}`);
    console.log(`         orden total: ${fmt(r.total_sale)} -> ${fmt(nuevoTotal)}   (cobrado ${fmt(r.cobrado)})`);
    console.log(`         venta: ${parse(r.items_json).length} items -> ${items.length} items`);

    if (APLICAR) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE service_orders SET services = $1, total_sale = $2, total_cost = $3, profit = $4, updated_at = NOW() WHERE id = $5`,
          [JSON.stringify(actualizados), nuevoTotal, nuevoCosto, nuevoTotal - nuevoCosto, r.id]
        );
        await client.query(
          `UPDATE sales SET items_json = $1, items_count = $2, subtotal = $3, updated_at = NOW() WHERE id = $4`,
          [JSON.stringify(items), items.length, nuevoTotal, r.sale_id]
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        console.error(`         ERROR, revertido: ${e.message}`);
        client.release();
        continue;
      }
      client.release();
    }
    reparadas++;
  }

  console.log(`\n${reparadas} orden(es) ${APLICAR ? "reparadas" : "a reparar"}, ${omitidas} omitida(s).`);
  if (!APLICAR && reparadas > 0) console.log("Volve a correr con --aplicar para escribir los cambios.");
  await pool.end();
})();
