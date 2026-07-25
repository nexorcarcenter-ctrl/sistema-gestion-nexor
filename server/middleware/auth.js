const jwt = require("jsonwebtoken");
const pool = require("../db");

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Verificar que el usuario sigue activo en la DB
    const result = await pool.query("SELECT id, username, role, is_active FROM users WHERE id = $1", [payload.id]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });
    if (result.rows[0].is_active === false) return res.status(403).json({ error: "Usuario desactivado" });
    req.user = { id: payload.id, username: result.rows[0].username, role: result.rows[0].role };
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token inválido" });
    }
    res.status(500).json({ error: "Error de autenticación" });
  }
}

module.exports = authMiddleware;
