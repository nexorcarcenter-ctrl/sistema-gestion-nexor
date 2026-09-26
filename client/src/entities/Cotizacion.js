import { apiFetch } from "./base.js";

// Cotización del dólar que el servidor consulta en internet cada algunas
// horas. Es una propuesta: en cada compra o pago se puede corregir a mano.
export const Cotizacion = {
  ultima: () => apiFetch("/api/exchange-rate"),
  actualizar: () => apiFetch("/api/exchange-rate/refresh", { method: "POST" }),
};
