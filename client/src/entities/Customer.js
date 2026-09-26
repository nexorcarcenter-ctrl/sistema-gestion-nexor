import { BaseEntity, apiFetch } from "./base.js";

// Clientes. Se crean y editan por la API genérica; los saldos y la ficha
// con ventas y cobros salen de /api/credit.
export class Customer extends BaseEntity {
  static get _entity() { return "customers"; }

  static async conSaldo() {
    return apiFetch("/api/credit/customers");
  }

  static async ficha(id) {
    return apiFetch(`/api/credit/customers/${id}`);
  }
}

// Ventas a crédito y cobros
export const Credito = {
  vender: (datos) => apiFetch("/api/credit/sales", { method: "POST", body: JSON.stringify(datos) }),
  venta: (id) => apiFetch(`/api/credit/sales/${id}`),
  cobrar: (id, datos) => apiFetch(`/api/credit/sales/${id}/collections`, { method: "POST", body: JSON.stringify(datos) }),
  borrarCobro: (id, pagoId) => apiFetch(`/api/credit/sales/${id}/collections/${pagoId}`, { method: "DELETE" }),
  aCobrar: () => apiFetch("/api/credit/receivables"),
};
