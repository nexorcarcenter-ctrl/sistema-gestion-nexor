import { BaseEntity } from "./base.js";

export class Product extends BaseEntity {
  static get _entity() { return "products"; }
}
