import { BaseEntity } from "./base.js";

export class Appointment extends BaseEntity {
  static get _entity() { return "appointments"; }
}
