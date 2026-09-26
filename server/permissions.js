/**
 * Único lugar donde se define quién puede hacer qué.
 *
 * Antes esto vivía repetido como `role === "admin"` en doce archivos: con dos
 * roles se toleraba, con tres alcanza con olvidarse de uno para abrir un hueco.
 */

const ROLES = ["admin", "gerente", "user"];
const ROL_POR_DEFECTO = "user";

/**
 * Entidades cuyo borrado destruiría informacion del pasado. Los reportes
 * calculan el costo de lo vendido buscando cada producto en el catalogo: si la
 * fila desaparece, las ventas viejas se quedan sin costo y la utilidad de meses
 * ya cerrados sube sola. Por eso "eliminar" las marca como inactivas en lugar
 * de borrarlas: dejan de aparecer, pero el historial las sigue encontrando.
 */
const ARCHIVABLES = {
  products:        { columna: "is_active", valorArchivado: false },
  categories:      { columna: "is_active", valorArchivado: false },
  payment_methods: { columna: "is_active", valorArchivado: false },
  // service_types no tiene is_active: marca su estado en una columna de texto
  service_types:   { columna: "status",    valorArchivado: "inactive" },
  // Las compras guardan a quien se le compro: borrar el proveedor dejaria
  // el historial y la comparacion de precios con un nombre huerfano
  suppliers:       { columna: "is_active", valorArchivado: false },
};

const PERMISOS = {
  admin: {
    verReportes: true,
    verGastos: true,
    gestionarUsuarios: true,
    verModulosEnConstruccion: true,
    gestionarCompras: true,
    archivar: "*",
    eliminar: "*",
  },
  gerente: {
    verReportes: true,
    verGastos: true,
    gestionarUsuarios: false,
    // Compras y Proveedores estan a medio hacer: no se le muestran todavia
    verModulosEnConstruccion: false,
    // El gerente es quien registra compras, pagos y proveedores
    gestionarCompras: true,
    archivar: ["products", "suppliers"],
    eliminar: ["expenses"],
  },
  user: {
    verReportes: false,
    verGastos: false,
    gestionarUsuarios: false,
    verModulosEnConstruccion: false,
    gestionarCompras: false,
    archivar: [],
    eliminar: [],
  },
};

/**
 * Tablas que no todos pueden mirar. La API de entidades es generica: sin esto,
 * cualquier usuario autenticado podria pedir /api/entities/expenses y ver los
 * sueldos y el alquiler.
 */
const TABLAS_RESTRINGIDAS = {
  expenses: "verGastos",
  expense_categories: "verGastos",
  purchase_orders: "gestionarCompras",
  purchase_order_items: "gestionarCompras",
};

function puedeAcceder(rol, tabla) {
  const requiere = TABLAS_RESTRINGIDAS[tabla];
  return !requiere || puede(rol, requiere);
}

function permisosDe(rol) {
  return PERMISOS[rol] || PERMISOS[ROL_POR_DEFECTO];
}

function puede(rol, accion) {
  return permisosDe(rol)[accion] === true;
}

function esArchivable(tabla) {
  return Object.prototype.hasOwnProperty.call(ARCHIVABLES, tabla);
}

function comoArchivar(tabla) {
  return ARCHIVABLES[tabla];
}

// Archivar: sacar de circulacion algo que el historial todavia referencia
function puedeArchivar(rol, tabla) {
  const permitido = permisosDe(rol).archivar;
  return permitido === "*" || (Array.isArray(permitido) && permitido.includes(tabla));
}

// Eliminar: borrar de verdad, solo para lo que nada mas referencia
function puedeEliminar(rol, tabla) {
  const permitido = permisosDe(rol).eliminar;
  return permitido === "*" || (Array.isArray(permitido) && permitido.includes(tabla));
}

// Un rol puede sacar un registro de la vista si puede archivarlo o eliminarlo
function puedeDarDeBaja(rol, tabla) {
  return esArchivable(tabla) ? puedeArchivar(rol, tabla) : puedeEliminar(rol, tabla);
}

function rolValido(rol) {
  return ROLES.includes(rol);
}

module.exports = {
  ROLES, ROL_POR_DEFECTO, ARCHIVABLES, TABLAS_RESTRINGIDAS,
  puede, rolValido, puedeAcceder,
  esArchivable, comoArchivar,
  puedeArchivar, puedeEliminar, puedeDarDeBaja,
};
