import { BaseEntity } from "./base.js";

export class ServiceOrder extends BaseEntity {
  static get _entity() { return "service_orders"; }
}
