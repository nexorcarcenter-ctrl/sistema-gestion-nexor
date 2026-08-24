import { BaseEntity } from "./base.js";

export class ExpenseCategory extends BaseEntity {
  static get _entity() { return "expense_categories"; }
}

export default ExpenseCategory;
