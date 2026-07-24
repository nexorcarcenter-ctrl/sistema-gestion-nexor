import { BaseEntity } from "./base.js";

export class Car extends BaseEntity {
  static get _entity() { return "cars"; }
}
