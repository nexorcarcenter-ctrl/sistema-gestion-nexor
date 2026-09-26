const pool = require("./db");

/**
 * Cotizacion del dolar, consultada en internet cada algunas horas.
 *
 * Se usa para proponer el tipo de cambio en compras y pagos en dolares; el
 * usuario siempre lo puede corregir. Se guarda en la base: si internet no
 * responde, se sigue usando el ultimo valor conocido y la pantalla avisa de
 * que fecha es.
 *
 * Se toma el valor de venta: cuando la empresa paga en dolares, es a ese
 * precio que los consigue.
 */

const CADA = 3 * 60 * 60 * 1000;
const TIMEOUT = 10000;

const FUENTES = [
  {
    nombre: "dolarapi.com (Uruguay)",
    url: "https://uy.dolarapi.com/v1/cotizaciones/usd",
    leer: (d) => ({ compra: Number(d.compra), venta: Number(d.venta), actualizada: d.fechaActualizacion }),
  },
  {
    // Respaldo: solo da un valor de referencia, sin compra/venta
    nombre: "exchangerate-api.com",
    url: "https://open.er-api.com/v6/latest/USD",
    leer: (d) => ({ compra: null, venta: Number(d.rates?.UYU), actualizada: d.time_last_update_utc ? new Date(d.time_last_update_utc).toISOString() : null }),
  },
];

async function consultar() {
  for (const f of FUENTES) {
    try {
      const res = await fetch(f.url, { signal: AbortSignal.timeout(TIMEOUT) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const c = f.leer(await res.json());
      // Un valor fuera de rango es un error de la fuente, no una cotizacion
      if (!(c.venta > 10 && c.venta < 500)) throw new Error(`valor inválido: ${c.venta}`);
      return { ...c, fuente: f.nombre };
    } catch (err) {
      console.error(`Cotización: ${f.nombre} no respondió (${err.message})`);
    }
  }
  return null;
}

async function actualizar() {
  const c = await consultar();
  if (!c) return;
  try {
    const { rows } = await pool.query("SELECT sell, buy, source FROM exchange_rates ORDER BY fetched_at DESC LIMIT 1");
    const ultima = rows[0];
    const igual = ultima && Number(ultima.sell) === c.venta && Number(ultima.buy || 0) === Number(c.compra || 0) && ultima.source === c.fuente;
    if (igual) {
      await pool.query("UPDATE exchange_rates SET fetched_at = NOW() WHERE id = (SELECT id FROM exchange_rates ORDER BY fetched_at DESC LIMIT 1)");
    } else {
      await pool.query(
        "INSERT INTO exchange_rates (currency, buy, sell, source, source_updated_at) VALUES ('USD', $1, $2, $3, $4)",
        [c.compra, c.venta, c.fuente, c.actualizada]
      );
      console.log(`✓ Cotización USD: venta ${c.venta} (${c.fuente})`);
    }
  } catch (err) {
    console.error("Cotización: no se pudo guardar:", err.message);
  }
}

async function ultima() {
  const { rows } = await pool.query(
    "SELECT buy, sell, source, source_updated_at, fetched_at FROM exchange_rates WHERE currency = 'USD' ORDER BY fetched_at DESC LIMIT 1"
  );
  const r = rows[0];
  if (!r) return null;
  const consultada = new Date(r.fetched_at);
  return {
    compra: r.buy != null ? Number(r.buy) : null,
    venta: Number(r.sell),
    fuente: r.source,
    actualizada_fuente: r.source_updated_at,
    consultada,
    // Si hace mas de un dia que no se pudo consultar, la pantalla lo avisa
    desactualizada: Date.now() - consultada.getTime() > 24 * 60 * 60 * 1000,
  };
}

function iniciar() {
  actualizar();
  setInterval(actualizar, CADA).unref();
}

module.exports = { iniciar, actualizar, ultima };
