/**
 * Espejo de server/permissions.js para decidir qué mostrar en pantalla.
 *
 * Esto es solo cosmética: define qué ve el usuario, no qué puede hacer.
 * Quien manda de verdad es el servidor, que vuelve a chequear cada pedido.
 * Si alguna vez se cambia un permiso, hay que cambiarlo en los dos lados.
 */

const PERMISOS = {
  admin:   { verReportes: true,  verGastos: true,  gestionarUsuarios: true,  verModulosEnConstruccion: true,  gestionarCompras: true,  archivar: "*",           eliminar: "*" },
  gerente: { verReportes: true,  verGastos: true,  gestionarUsuarios: false, verModulosEnConstruccion: false, gestionarCompras: true,  archivar: ["products", "suppliers"], eliminar: ["expenses"] },
  user:    { verReportes: false, verGastos: false, gestionarUsuarios: false, verModulosEnConstruccion: false, gestionarCompras: false, archivar: [],            eliminar: [] },
};

const ROL_POR_DEFECTO = "user";

export const ROLES = [
  { valor: "admin",   etiqueta: "Administrador" },
  { valor: "gerente", etiqueta: "Gerente" },
  { valor: "user",    etiqueta: "Usuario" },
];

function permisosDe(rol) {
  return PERMISOS[rol] || PERMISOS[ROL_POR_DEFECTO];
}

export function puede(rol, accion) {
  return permisosDe(rol)[accion] === true;
}

export function puedeDarDeBaja(rol, tabla) {
  const p = permisosDe(rol);
  const lista = [p.archivar, p.eliminar];
  return lista.some((x) => x === "*" || (Array.isArray(x) && x.includes(tabla)));
}

export function etiquetaDeRol(rol) {
  return ROLES.find((r) => r.valor === rol)?.etiqueta || rol;
}

// El rol viaja dentro del token; sirve para decidir sin esperar una respuesta
export function rolDelToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).role || null;
  } catch {
    return null;
  }
}
