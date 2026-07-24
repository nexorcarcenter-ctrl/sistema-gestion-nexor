import { BaseEntity } from "./base.js";

export class Payment extends BaseEntity {
  static get _entity() { return "payments"; }
}
