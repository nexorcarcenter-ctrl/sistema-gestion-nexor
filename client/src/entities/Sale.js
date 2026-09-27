import { BaseEntity, apiFetch } from "./base.js";

export class Sale extends BaseEntity {
  static get _entity() { return "sales"; }

  // Venta directa de contado: venta, stock y pagos de la caja en una sola transacción
  static async registrarContado(datos) {
    return apiFetch("/api/sales/direct", { method: "POST", body: JSON.stringify(datos) });
  }
}
