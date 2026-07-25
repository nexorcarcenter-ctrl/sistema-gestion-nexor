const router = require("express").Router();
const pool = require("../db");

// Atomic stock movement — updates product + creates movement record in a single transaction
router.post("/move", async (req, res) => {
  const { product_id, movement_type, quantity, reference_type, reference_number, reason } = req.body;

  if (!product_id || !movement_type || quantity == null) {
    return res.status(400).json({ error: "product_id, movement_type y quantity son requeridos" });
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty === 0) {
    return res.status(400).json({ error: "quantity debe ser un entero distinto de cero" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the product row to prevent race conditions
    const prodResult = await client.query(
      "SELECT id, name, sku, stock_quantity FROM products WHERE id = $1 FOR UPDATE",
      [product_id]
    );
    if (prodResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const product = prodResult.rows[0];
    const previousStock = Number(product.stock_quantity) || 0;
    const newStock = Math.max(0, previousStock + qty);

    // Update product stock
    await client.query(
      "UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2",
      [newStock, product_id]
    );

    // Create movement record
    const movResult = await client.query(
      `INSERT INTO stock_movements (product_id, product_name, sku, movement_type, quantity, previous_stock, new_stock, reference_type, reference_number, reason, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
      [product_id, product.name, product.sku || "", movement_type, qty, previousStock, newStock, reference_type || "manual", reference_number || "", reason || ""]
    );

    await client.query("COMMIT");

    res.status(201).json({
      movement: movResult.rows[0],
      product: { id: product.id, stock_quantity: newStock }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Stock move error:", err);
    res.status(500).json({ error: "Error al actualizar stock" });
  } finally {
    client.release();
  }
});

// Bulk stock movement — for sales with multiple products
router.post("/move-bulk", async (req, res) => {
  const { movements } = req.body;

  if (!Array.isArray(movements) || movements.length === 0) {
    return res.status(400).json({ error: "movements debe ser un array no vacío" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const results = [];

    for (const mov of movements) {
      const { product_id, movement_type, quantity, reference_type, reference_number, reason } = mov;
      if (!product_id || !movement_type || quantity == null) continue;

      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty === 0) continue;

      const prodResult = await client.query(
        "SELECT id, name, sku, stock_quantity FROM products WHERE id = $1 FOR UPDATE",
        [product_id]
      );
      if (prodResult.rows.length === 0) continue;

      const product = prodResult.rows[0];
      const previousStock = Number(product.stock_quantity) || 0;
      const newStock = Math.max(0, previousStock + qty);

      await client.query(
        "UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2",
        [newStock, product_id]
      );

      const movResult = await client.query(
        `INSERT INTO stock_movements (product_id, product_name, sku, movement_type, quantity, previous_stock, new_stock, reference_type, reference_number, reason, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
        [product_id, product.name, product.sku || "", movement_type, qty, previousStock, newStock, reference_type || "manual", reference_number || "", reason || ""]
      );

      results.push({
        movement: movResult.rows[0],
        product: { id: product.id, stock_quantity: newStock }
      });
    }

    await client.query("COMMIT");
    res.status(201).json(results);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Stock bulk move error:", err);
    res.status(500).json({ error: "Error al actualizar stock" });
  } finally {
    client.release();
  }
});

module.exports = router;
