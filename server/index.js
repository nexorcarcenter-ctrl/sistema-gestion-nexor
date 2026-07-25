require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const pool = require("./db");
const fs = require("fs");

const app = express();

// CORS — en producción solo acepta requests del mismo origen (SPA servida por Express)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : [];
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));

// Rate limiting para login y PIN (máx 10 intentos por IP en 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos. Intentá de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/verify-pin", authLimiter);

const authMiddleware = require("./middleware/auth");

// Auth routes (public)
app.use("/api/auth", require("./routes/auth"));

// Entity routes (protected)
app.use("/api/entities", authMiddleware, require("./routes/entity"));

// Stock routes (protected)
app.use("/api/stock", authMiddleware, require("./routes/stock"));

// Sequence routes (protected)
app.use("/api/sequence", authMiddleware, require("./routes/sequence"));

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Serve frontend
const distPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Run migrations on startup
async function runMigrations() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "migrations/001_initial.sql"), "utf8");
    await pool.query(sql);
    console.log("✓ Migrations OK");
  } catch (err) {
    console.error("Migration error:", err.message);
  }
}

// Create default admin user if no users exist
async function seedAdmin() {
  try {
    const bcrypt = require("bcryptjs");
    const { rows } = await pool.query("SELECT id FROM users LIMIT 1");
    if (rows.length === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await pool.query(
        `INSERT INTO users (username, email, password_hash, full_name, cargo, role) VALUES ($1, $2, $3, $4, $5, 'admin')`,
        ["admin", "admin@taller.com", hash, "Admin", "admin"]
      );
      console.log("✓ Usuario admin creado — usuario: admin / pass: admin123");
    } else {
      // Backfill: asignar username a usuarios que no tengan
      await pool.query("UPDATE users SET username = email WHERE username IS NULL");
    }
  } catch (err) {
    console.error("Seed error:", err.message);
  }
}

// One-time: backfill sale_price in service_orders JSON using current product unit_price
async function backfillSalePrices() {
  try {
    const { rows: orders } = await pool.query(
      "SELECT id, services FROM service_orders WHERE services IS NOT NULL"
    );
    const { rows: products } = await pool.query("SELECT id, unit_price FROM products");
    const priceMap = {};
    for (const p of products) priceMap[String(p.id)] = Number(p.unit_price) || 0;

    let updated = 0;
    for (const order of orders) {
      let services;
      try { services = typeof order.services === "string" ? JSON.parse(order.services) : order.services; }
      catch { continue; }
      if (!Array.isArray(services)) continue;

      let changed = false;
      for (const svc of services) {
        if (!Array.isArray(svc.products)) continue;
        let productsTotal = 0;
        for (const p of svc.products) {
          const unitPrice = priceMap[String(p.product_id)];
          if (unitPrice !== undefined && (Number(p.sale_price) || 0) !== unitPrice) {
            p.sale_price = unitPrice;
            changed = true;
          }
          productsTotal += (Number(p.sale_price) || 0) * (Number(p.quantity) || 1);
        }
        // Recalc: sale_price del servicio = productos + mano de obra
        const labor = Number(svc.labor_cost) || Math.max(0, (Number(svc.sale_price) || 0) - productsTotal);
        if (!svc.labor_cost && labor > 0) svc.labor_cost = labor;
        const newSalePrice = productsTotal + (Number(svc.labor_cost) || 0);
        if (newSalePrice !== (Number(svc.sale_price) || 0)) {
          svc.sale_price = newSalePrice;
          changed = true;
        }
      }
      if (changed) {
        await pool.query("UPDATE service_orders SET services = $1, updated_at = NOW() WHERE id = $2",
          [JSON.stringify(services), order.id]);
        updated++;
      }
    }
    if (updated > 0) console.log(`✓ Backfill: ${updated} orden(es) actualizada(s) con precios de venta`);

    // Fix payment_status for orders that are fully paid but stuck as "partial"
    const { rowCount } = await pool.query(`
      UPDATE service_orders
      SET payment_status = 'paid', updated_at = NOW()
      WHERE payment_status = 'partial'
        AND COALESCE(paid_amount, 0) >= COALESCE(total_sale, 0)
        AND COALESCE(total_sale, 0) > 0
    `);
    if (rowCount > 0) console.log(`✓ Backfill: ${rowCount} orden(es) corregida(s) de partial → paid`);
  } catch (err) {
    console.error("Backfill sale prices error:", err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await runMigrations();
  await seedAdmin();
  await backfillSalePrices();
});
