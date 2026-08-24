import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import User from "@/entities/User";
import { puede } from "@/permissions";

/**
 * Deja pasar solo a quien tiene el permiso; al resto lo manda al inicio.
 *
 * Se diferencia de ComingSoonGuard a proposito: aquel muestra la seccion
 * borrosa con "Proximamente" porque la idea es que se vea que existe. Esto
 * es para secciones que directamente no le corresponden al usuario, que
 * tampoco las ve en el menu.
 */
export default function RequierePermiso({ children, permiso }) {
  const [habilitado, setHabilitado] = useState(null);

  useEffect(() => {
    User.me()
      .then((u) => setHabilitado(puede(u?.role, permiso)))
      .catch(() => setHabilitado(false));
  }, [permiso]);

  if (habilitado === null) return null;
  return habilitado ? children : <Navigate to="/" replace />;
}
