const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");

// Register — deshabilitado, solo el admin puede crear usuarios desde el panel
// router.post("/register", ...);

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Usuario y contraseña requeridos" });

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username.toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Credenciales inválidas" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Credenciales inválidas" });
    if (user.is_active === false) return res.status(403).json({ error: "Usuario desactivado. Contactá al administrador." });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id: user.id, username: user.username, fullName: user.full_name, cargo: user.cargo, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, full_name, cargo, role FROM users WHERE id = $1", [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    const u = result.rows[0];
    res.json({ id: u.id, username: u.username, fullName: u.full_name, cargo: u.cargo, role: u.role });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Update profile
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { fullName, cargo } = req.body;
    const result = await pool.query(
      "UPDATE users SET full_name = $1, cargo = $2, updated_at = NOW() WHERE id = $3 RETURNING id, email, full_name, cargo, role",
      [fullName, cargo, req.user.id]
    );
    const u = result.rows[0];
    res.json({ id: u.id, email: u.email, fullName: u.full_name, cargo: u.cargo, role: u.role });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ── Admin: gestión de usuarios ─────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acceso restringido" });
  next();
}

// Listar todos los usuarios
router.get("/users", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, full_name, cargo, role, is_active, created_at FROM users ORDER BY created_at ASC"
    );
    res.json(result.rows.map(u => ({
      id: u.id, username: u.username, fullName: u.full_name,
      cargo: u.cargo, role: u.role, isActive: u.is_active !== false, createdAt: u.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Crear usuario (sin auto-login)
router.post("/users", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, cargo, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Usuario y contraseña requeridos" });

    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(400).json({ error: "El usuario ya está registrado" });

    const validRole = role === "admin" ? "admin" : "user";
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, cargo, role, is_active, created_at, updated_at)
       VALUES ($1, $1, $2, $3, $4, $5, TRUE, NOW(), NOW())
       RETURNING id, username, full_name, cargo, role, is_active`,
      [username.toLowerCase(), hash, fullName || "", cargo || "otro", validRole]
    );
    const u = result.rows[0];
    res.json({ id: u.id, username: u.username, fullName: u.full_name, cargo: u.cargo, role: u.role, isActive: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Actualizar usuario (nombre, cargo, username, activar/desactivar)
router.put("/users/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fullName, cargo, isActive, username, role } = req.body;
    const fields = ["full_name = $1", "cargo = $2", "is_active = $3", "updated_at = NOW()"];
    const values = [fullName, cargo, isActive !== false];
    if (role && (role === "admin" || role === "user")) {
      fields.push(`role = $${values.length + 1}`);
      values.push(role);
    }
    if (username) {
      const dup = await pool.query("SELECT id FROM users WHERE username = $1 AND id != $2", [username.toLowerCase(), req.params.id]);
      if (dup.rows.length > 0) return res.status(400).json({ error: "Ese usuario ya está en uso" });
      fields.push(`username = $${values.length + 1}`);
      values.push(username.toLowerCase());
    }
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id, username, full_name, cargo, role, is_active`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    const u = result.rows[0];
    res.json({ id: u.id, username: u.username, fullName: u.full_name, cargo: u.cargo, role: u.role, isActive: u.is_active });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Eliminar usuario (solo admin, no puede eliminarse a sí mismo)
router.delete("/users/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (String(req.user.id) === String(req.params.id)) return res.status(400).json({ error: "No podés eliminarte a vos mismo" });
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Setear PIN de caja (solo admin)
router.put("/users/:id/pin", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: "El PIN debe tener entre 4 y 6 dígitos" });
    const hash = await bcrypt.hash(pin, 10);
    const result = await pool.query("UPDATE users SET pin_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id", [hash, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verificar PIN — devuelve el usuario que coincide (público dentro de la app)
router.post("/verify-pin", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: "PIN requerido" });
    const result = await pool.query("SELECT id, full_name, cargo, pin_hash FROM users WHERE pin_hash IS NOT NULL AND is_active = TRUE");
    for (const user of result.rows) {
      const match = await bcrypt.compare(pin, user.pin_hash);
      if (match) return res.json({ id: user.id, fullName: user.full_name, cargo: user.cargo });
    }
    res.status(401).json({ error: "PIN incorrecto" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resetear contraseña
router.put("/users/:id/password", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    const hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
