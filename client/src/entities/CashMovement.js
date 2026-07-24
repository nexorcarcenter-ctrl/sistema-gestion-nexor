import { BaseEntity } from "./base.js";

export class CashMovement extends BaseEntity {
  static get _entity() { return "cash_movements"; }
}
