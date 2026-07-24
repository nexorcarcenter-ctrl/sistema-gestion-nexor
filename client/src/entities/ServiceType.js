import { BaseEntity } from "./base.js";

export class ServiceType extends BaseEntity {
  static get _entity() { return "service_types"; }
}
