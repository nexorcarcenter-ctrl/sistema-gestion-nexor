const router = require("express").Router();
const pool = require("../db");
const permisos = require("../permissions");

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
  customers: "customers",
  expenses: "expenses",
  expense_categories: "expense_categories",
};

function getTable(entity) {
  return ENTITY_TABLES[entity];
}

// Antes de cualquier operacion: hay tablas que no todos pueden ni mirar.
router.use("/:entity", (req, res, next) => {
  const table = getTable(req.params.entity);
  if (table && !permisos.puedeAcceder(req.user?.role, table)) {
    return res.status(403).json({ error: "No tenés permisos para acceder a esta información" });
  }
  next();
});

// Las compras tocan stock, costos, gastos y proveedores a la vez: si se
// escribieran por aca, una falla a mitad de camino dejaria el stock sumado sin
// gasto o al reves. Por eso solo se escriben desde routes/purchases.js, dentro
// de una transaccion. Lo mismo el gasto que genera cada compra: se cambia
// editando o anulando la compra, nunca suelto.
router.use("/:entity/:id?", async (req, res, next) => {
  if (req.method === "GET") return next();
  const table = getTable(req.params.entity);
  if (table === "purchase_orders") {
    return res.status(409).json({ error: "Las compras se registran, editan o anulan desde Compra Directa" });
  }
  // Ventas a credito y sus cobros: tocan saldo del cliente y caja a la vez,
  // se escriben solo desde routes/credit.js
  if (table === "sales" && req.params.id && req.params.id !== "bulk") {
    try {
      const { rows } = await pool.query("SELECT payment_type FROM sales WHERE id::text = $1", [req.params.id]);
      if (rows[0]?.payment_type === "credito") {
        return res.status(409).json({ error: "Las ventas a crédito se manejan desde Cuentas a cobrar" });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  if (table === "payments" && req.params.id && req.params.id !== "bulk") {
    try {
      const { rows } = await pool.query("SELECT sale_id FROM payments WHERE id::text = $1", [req.params.id]);
      if (rows[0]?.sale_id) {
        return res.status(409).json({ error: "Este pago es de una venta: no se modifica suelto" });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  if (table === "expenses" && req.params.id && req.params.id !== "bulk") {
    try {
      const { rows } = await pool.query("SELECT purchase_order_id FROM expenses WHERE id = $1", [req.params.id]);
      if (rows[0]?.purchase_order_id) {
        return res.status(409).json({ error: "Este gasto viene de una compra: se modifica editando o anulando la compra" });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  next();
});

// Un proveedor repetido parte en dos su historial de compras y la
// comparacion de precios. Se compara contra los activos por nombre (sin
// importar mayusculas ni espacios) y por RUT.
router.use("/suppliers/:id?", async (req, res, next) => {
  if (!["POST", "PUT"].includes(req.method) || req.params.id === "bulk") return next();
  const nombre = (req.body?.name || "").trim();
  const rut = (req.body?.tax_id || "").replace(/\D/g, "");
  if (!nombre && !rut) return next();
  try {
    const { rows } = await pool.query(`
      SELECT name, tax_id FROM suppliers
      WHERE is_active IS NOT FALSE
        AND ($1::text IS NULL OR id::text <> $1)
        AND ((LOWER(TRIM(name)) = LOWER($2) AND $2 <> '')
          OR ($3 <> '' AND regexp_replace(COALESCE(tax_id, ''), '\\D', '', 'g') = $3))
      LIMIT 1
    `, [req.params.id || null, nombre, rut]);
    if (rows[0]) {
      const porRut = rut && (rows[0].tax_id || "").replace(/\D/g, "") === rut;
      return res.status(409).json({
        error: porRut
          ? `Ya existe un proveedor con ese RUT: ${rows[0].name}`
          : `Ya existe un proveedor llamado ${rows[0].name}`,
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Un cliente repetido parte en dos su cuenta: se busca por telefono, por
// RUT/cedula y por nombre exacto entre los activos
router.use("/customers/:id?", async (req, res, next) => {
  if (!["POST", "PUT"].includes(req.method) || req.params.id === "bulk") return next();
  const nombre = (req.body?.name || "").trim();
  const tel = (req.body?.phone || "").replace(/\D/g, "");
  const doc = (req.body?.tax_id || "").replace(/\D/g, "");
  if (!nombre && !tel && !doc) return next();
  try {
    const { rows } = await pool.query(`
      SELECT name, phone, tax_id FROM customers
      WHERE is_active IS NOT FALSE
        AND ($1::text IS NULL OR id::text <> $1)
        AND ((LOWER(TRIM(name)) = LOWER($2) AND $2 <> '')
          OR (length($3) >= 6 AND regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $3)
          OR (length($4) >= 6 AND regexp_replace(COALESCE(tax_id, ''), '\\D', '', 'g') = $4))
      LIMIT 1
    `, [req.params.id || null, nombre, tel, doc]);
    if (rows[0]) {
      return res.status(409).json({ error: `Ya existe el cliente ${rows[0].name}${rows[0].phone ? ` (${rows[0].phone})` : ""}` });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Whitelist de columnas válidas por tabla (previene SQL injection)
const VALID_COLUMNS = new Set([
  // Credito a clientes
  "customer_id", "payment_type", "credit_days", "due_date", "paid_amount", "sale_id",
  "payment_date", "customer_phone",
  // Compra directa
  "expense_type", "purchase_order_id", "invoice_number", "expense_id", "total_uyu",
  // Gastos de la empresa
  "expense_date", "category_id", "category_name", "amount_uyu", "is_fixed",
  "payment_method_id", "payment_method_name", "created_by_name",
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

// Dar de baja un registro.
//
// Lo que el catalogo referencia desde el pasado se archiva en vez de borrarse:
// los reportes buscan el costo de cada producto vendido en la tabla de
// productos, y si la fila desaparece las ventas viejas se quedan sin costo,
// inflando la utilidad de meses ya cerrados. Lo demas se borra de verdad.
router.delete("/:entity/:id", async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    if (!table) return res.status(404).json({ error: "Entity not found" });

    const rol = req.user?.role;
    if (!permisos.puedeDarDeBaja(rol, table)) {
      return res.status(403).json({ error: "No tenés permisos para eliminar este registro" });
    }

    const archivo = permisos.comoArchivar(table);
    if (archivo) {
      const { rowCount } = await pool.query(
        `UPDATE ${table} SET ${archivo.columna} = $1, updated_at = NOW() WHERE id = $2`,
        [archivo.valorArchivado, req.params.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: "No encontrado" });
      return res.json({ success: true, archivado: true });
    }

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
