import { BaseEntity, apiFetch } from "./base.js";

export class StockMovement extends BaseEntity {
  static get _entity() { return "stock_movements"; }

  // Atomic stock move — updates product + creates movement in one transaction
  static async move(data) {
    return apiFetch("/api/stock/move", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Bulk atomic stock move — for sales with multiple products
  static async moveBulk(movements) {
    return apiFetch("/api/stock/move-bulk", {
      method: "POST",
      body: JSON.stringify({ movements }),
    });
  }
}
