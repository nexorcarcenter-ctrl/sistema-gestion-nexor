import { BaseEntity, apiFetch } from "./base.js";

// Leer se puede por la API genérica; escribir no. Registrar, editar y anular
// pasan por /api/purchases porque tocan stock, costos, gastos y proveedor en
// una sola transacción.
export class PurchaseOrder extends BaseEntity {
  static get _entity() { return "purchase_orders"; }

  static async detalle(id) {
    return apiFetch(`/api/purchases/${id}`);
  }

  static async registrar(datos) {
    return apiFetch("/api/purchases", { method: "POST", body: JSON.stringify(datos) });
  }

  static async editar(id, datos) {
    return apiFetch(`/api/purchases/${id}`, { method: "PUT", body: JSON.stringify(datos) });
  }

  static async anular(id) {
    return apiFetch(`/api/purchases/${id}/cancel`, { method: "POST" });
  }

  // Solo pedidos del sistema anterior que nunca se recibieron
  static async borrarPedido(id) {
    return apiFetch(`/api/purchases/${id}`, { method: "DELETE" });
  }

  static async precios(productId) {
    const q = productId ? `?product_id=${encodeURIComponent(productId)}` : "";
    return apiFetch(`/api/purchases/prices${q}`);
  }

  static async historialProveedor(supplierId) {
    return apiFetch(`/api/purchases/supplier/${supplierId}`);
  }
}
