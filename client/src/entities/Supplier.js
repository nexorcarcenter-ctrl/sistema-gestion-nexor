import { BaseEntity } from "./base.js";

export class Supplier extends BaseEntity {
  static get _entity() { return "suppliers"; }
}
