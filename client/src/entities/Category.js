import { BaseEntity } from "./base.js";

export class Category extends BaseEntity {
  static get _entity() { return "categories"; }
}
