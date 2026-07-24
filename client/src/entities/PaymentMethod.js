import { BaseEntity } from "./base.js";

export class PaymentMethod extends BaseEntity {
  static get _entity() { return "payment_methods"; }
}
