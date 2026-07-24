import { BaseEntity } from "./base.js";

export class Sale extends BaseEntity {
  static get _entity() { return "sales"; }
}
