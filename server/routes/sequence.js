const router = require("express").Router();
const pool = require("../db");

// Prefixes and their corresponding tables/columns
const SEQUENCE_CONFIG = {
  sale: { table: "sales", column: "sale_number", prefix: "V" },
  pos_sale: { table: "sales", column: "sale_number", prefix: "S" },
  service_order: { table: "service_orders", column: "order_number", prefix: "OS" },
  purchase_order: { table: "purchase_orders", column: "po_number", prefix: "PO" },
  remito: { table: "remitos", column: "remito_number", prefix: "REM" },
};

router.get("/:type", async (req, res) => {
  const config = SEQUENCE_CONFIG[req.params.type];
  if (!config) return res.status(400).json({ error: "Tipo de secuencia inválido" });

  try {
    // Get max existing number for this prefix
    const result = await pool.query(
      `SELECT ${config.column} FROM ${config.table} WHERE ${config.column} LIKE $1 ORDER BY created_at DESC LIMIT 1`,
      [`${config.prefix}-%`]
    );

    let nextNum = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0][config.column];
      const numPart = parseInt(lastNumber.replace(`${config.prefix}-`, ""), 10);
      if (!isNaN(numPart)) nextNum = numPart + 1;
    }

    const formatted = `${config.prefix}-${String(nextNum).padStart(6, "0")}`;
    res.json({ number: formatted });
  } catch (err) {
    console.error("Sequence error:", err);
    res.status(500).json({ error: "Error al generar número" });
  }
});

module.exports = router;
