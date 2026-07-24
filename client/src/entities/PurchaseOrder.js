import { BaseEntity } from "./base.js";

export class PurchaseOrder extends BaseEntity {
  static get _entity() { return "purchase_orders"; }
}
