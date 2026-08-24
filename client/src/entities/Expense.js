import { BaseEntity } from "./base.js";

export class Expense extends BaseEntity {
  static get _entity() { return "expenses"; }
}

export default Expense;
