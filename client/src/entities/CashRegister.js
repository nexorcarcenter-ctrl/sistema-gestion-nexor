import { BaseEntity } from "./base.js";

export class CashRegister extends BaseEntity {
  static get _entity() { return "cash_registers"; }
}
