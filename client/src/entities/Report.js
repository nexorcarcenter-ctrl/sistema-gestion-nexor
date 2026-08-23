import { apiFetch } from "./base";
import moment from "moment";

const API_BASE = "/api/reports";

// Períodos rápidos: siempre relativos a hoy.
export function rangoDelPeriodo(periodo) {
  const hoy = moment();
  const unidad = { today: "day", week: "week", month: "month", year: "year" }[periodo] || "month";
  return {
    from: hoy.clone().startOf(unidad).format("YYYY-MM-DD"),
    to: hoy.clone().endOf(unidad).format("YYYY-MM-DD"),
  };
}

// Acepta un período rápido ("month") o un rango explícito ({ from, to }).
// El backend siempre recibe fechas concretas.
function resolverRango(periodoORango) {
  if (periodoORango && typeof periodoORango === "object") {
    const { from, to } = periodoORango;
    if (from && to) return { from, to };
  }
  return rangoDelPeriodo(periodoORango);
}

// Últimos N meses cerrados, para el selector de mes
export function mesesDisponibles(cantidad = 12) {
  return Array.from({ length: cantidad }, (_, i) => {
    const m = moment().subtract(i, "months");
    return {
      valor: m.format("YYYY-MM"),
      etiqueta: m.format("MMMM YYYY"),
      from: m.clone().startOf("month").format("YYYY-MM-DD"),
      to: m.clone().endOf("month").format("YYYY-MM-DD"),
    };
  });
}

export const Report = {
  async summary(periodo = "month") {
    const { from, to } = resolverRango(periodo);
    return apiFetch(`${API_BASE}/summary?from=${from}&to=${to}`);
  },

  async timeseries(months = 6) {
    return apiFetch(`${API_BASE}/timeseries?months=${months}`);
  },

  async top(periodo = "month", limit = 6) {
    const { from, to } = resolverRango(periodo);
    return apiFetch(`${API_BASE}/top?from=${from}&to=${to}&limit=${limit}`);
  },
};

export default Report;
