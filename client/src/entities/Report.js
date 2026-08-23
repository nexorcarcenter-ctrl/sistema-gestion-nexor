import { apiFetch } from "./base";
import moment from "moment";

const API_BASE = "/api/reports";

// Convierte el período elegido en la UI a un rango de fechas concreto.
// El backend siempre recibe from/to explícitos, nunca "este mes".
export function rangoDelPeriodo(periodo) {
  const hoy = moment();
  const unidad = { today: "day", week: "week", month: "month", year: "year" }[periodo] || "month";
  return {
    from: hoy.clone().startOf(unidad).format("YYYY-MM-DD"),
    to: hoy.clone().endOf(unidad).format("YYYY-MM-DD"),
  };
}

export const Report = {
  async summary(periodo = "month") {
    const { from, to } = rangoDelPeriodo(periodo);
    return apiFetch(`${API_BASE}/summary?from=${from}&to=${to}`);
  },

  async timeseries(months = 6) {
    return apiFetch(`${API_BASE}/timeseries?months=${months}`);
  },

  async top(periodo = "month", limit = 6) {
    const { from, to } = rangoDelPeriodo(periodo);
    return apiFetch(`${API_BASE}/top?from=${from}&to=${to}&limit=${limit}`);
  },
};

export default Report;
