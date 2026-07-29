const router = require("express").Router();
const pool = require("../db");

function requireAdminForWrite(req, res, next) {
  next();
}

// Map entity names to table names
const ENTITY_TABLES = {
  appointments: "appointments",
  cars: "cars",
  car_brands: "car_brands",
  cash_movements: "cash_movements",
  cash_registers: "cash_registers",
  categories: "categories",
  payments: "payments",
  payment_methods: "payment_methods",
  products: "products",
  purchase_orders: "purchase_orders",
  remitos: "remitos",
  sales: "sales",
  service_orders: "service_orders",
  service_types: "service_types",
  stock_movements: "stock_movements",
  suppliers: "suppliers",
};

function getTable(entity) {
  return ENTITY_TABLES[entity];
}

// Whitelist de columnas válidas por tabla (previene SQL injection)
const VALID_COLUMNS = new Set([
  "id", "name", "email", "username", "full_name", "cargo", "role", "is_active",
  "status", "sku", "barcode", "description", "category", "unit_price", "cost_price",
  "stock_quantity", "min_stock", "max_stock", "supplier_id", "supplier_name",
  "unit", "tax_rate", "image_url", "location", "volume_discounts", "car_brand",
  "car_model", "car_year", "brand", "model", "year", "color", "plate", "vin",
  "mileage", "fuel_type", "transmission", "engine_cc", "doors", "body_type",
  "condition", "purchase_price", "sale_price", "features", "notes", "entry_date",
  "customer_name", "customer_phone", "car_plate", "car_color", "car_mileage",
  "delivery_date", "services", "total_sale", "total_cost", "profit",
  "payment_status", "paid_amount", "sale_id", "sale_number", "order_number",
  "inspection_data", "inspection_status", "appointment_time", "inspection_observations",
  "car_mileage_exit", "exit_inspection_data", "exit_inspection_status", "exit_observations",
  "po_number", "order_date", "expected_date", "received_date", "items_json",
  "items_count", "subtotal", "tax_amount", "shipping_cost", "total", "shipping_cost",
  "contact_name", "phone", "address", "city", "country", "tax_id", "payment_terms",
  "total_orders", "total_spent", "rating", "currency", "type", "sort_order",
  "date", "time", "service_description", "opened_at", "closed_at",
  "petty_cash_uyu", "petty_cash_usd", "opening_balance_uyu", "opening_balance_usd",
  "closing_balance_uyu", "closing_balance_usd", "difference_uyu", "difference_usd",
  "total_uyu", "total_usd", "opened_by", "closed_by",
  "sale_date", "sale_type", "service_order_id", "service_order_number",
  "vehicle", "payments_json", "discount_amount", "cash_register_id", "cashier",
  "amount", "payment_method", "exchange_rate", "amount_uyu_equivalent", "paid_at",
  "remito_number", "items", "issued_by", "concept", "moved_at", "created_by",
  "models_json", "name_es", "icon", "parent_id", "product_count",
  "product_id", "product_name", "movement_type", "quantity", "previous_stock",
  "new_stock", "unit_cost", "reference_type", "reference_number", "reason",
  "created_at", "updated_at", "pin_hash"
]);

function isValidColumn(col) {
  return VALID_COLUMNS.has(col);
}

// Parse sort: "-createdAt" → ORDER BY created_at DESC
function parseSort(sort) {
  if (!sort) return "created_at DESC";
  const desc = sort.startsWith("-");
  const field = sort.replace(/^-/, "");
  const col = field.replace(/([A-Z])/g, "_$1").toLowerCase();
  if (!isValidColumn(col)) return "created_at DESC";
  return `${col} ${desc ? "DESC" : "ASC"}`;
}

// List
router.get("/:entity", async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    if (!table) return res.status(404).json({ error: "Entity not found" });

    const { sort, limit, ...filters } = req.query;
    const orderBy = parseSort(sort);
    const lim = Math.min(parseInt(limit) || 500, 5000);

    const conditions = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(filters)) {
      const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (!isValidColumn(col)) continue;
      conditions.push(`${col} = $${idx++}`);
      values.push(val);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM ${table} ${where} ORDER BY ${orderBy} LIMIT ${lim}`,
      values
    );
    res.json(rowsToCamel(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get by ID
router.get("/:entity/:id", async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    if (!table) return res.status(404).json({ error: "Entity not found" });
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create
router.post("/:entity", requireAdminForWrite, async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    if (!table) return res.status(404).json({ error: "Entity not found" });

    const data = toSnake(req.body);
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");

    const result = await pool.query(
      `INSERT INTO ${table} (${cols.join(", ")}, created_at, updated_at)
       VALUES (${placeholders}, NOW(), NOW()) RETURNING *`,
      vals
    );
    res.status(201).json(rowToCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk create
router.post("/:entity/bulk", requireAdminForWrite, async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    if (!table) return res.status(404).json({ error: "Entity not found" });

    const items = Array.isArray(req.body) ? req.body : [];
    const results = [];
    for (const item of items) {
      const data = toSnake(item);
      const cols = Object.keys(data);
      const vals = Object.values(data);
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
      const r = await pool.query(
        `INSERT INTO ${table} (${cols.join(", ")}, created_at, updated_at)
         VALUES (${placeholders}, NOW(), NOW()) RETURNING *`,
        vals
      );
      results.push(rowToCamel(r.rows[0]));
    }
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
router.put("/:entity/:id", requireAdminForWrite, async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    if (!table) return res.status(404).json({ error: "Entity not found" });

    const data = toSnake(req.body);
    const SKIP = new Set(["id", "created_at", "updated_at"]);
    const entries = Object.entries(data).filter(([col]) => !SKIP.has(col));
    const sets = entries.map(([col], i) => `${col} = $${i + 1}`).join(", ");
    const vals = entries.map(([, v]) => v);

    const result = await pool.query(
      `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${vals.length + 1} RETURNING *`,
      [...vals, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete — solo admin puede eliminar registros
router.delete("/:entity/:id", (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Solo administradores pueden eliminar registros" });
  next();
}, async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    if (!table) return res.status(404).json({ error: "Entity not found" });
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Helpers ---
function toSnake(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const col = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (!isValidColumn(col)) continue;
    result[col] = v;
  }
  return result;
}

function rowToCamel(row) {
  const result = {};
  for (const [k, v] of Object.entries(row)) {
    // Keep snake_case original AND add camelCase version
    result[k] = v;
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (camel !== k) result[camel] = v;
  }
  // Normalize id to string
  if (result.id) result.id = String(result.id);
  return result;
}

function rowsToCamel(rows) {
  return rows.map(rowToCamel);
}

module.exports = router;
