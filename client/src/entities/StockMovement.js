import { BaseEntity } from "./base.js";

export class StockMovement extends BaseEntity {
  static get _entity() { return "stock_movements"; }
}
