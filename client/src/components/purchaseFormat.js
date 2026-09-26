import moment from "moment";

// Formatos compartidos por las pantallas de compras y proveedores
export const fmtMoneda = (v, moneda = "UYU") => {
  const n = Number(v) || 0;
  const texto = n.toLocaleString("es-UY", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return moneda === "USD" ? `US$ ${texto}` : `$ ${texto}`;
};

export const fmtFecha = (f) => (f ? moment.utc(f).format("DD/MM/YYYY") : "—");

export const TASAS_IVA = [
  { valor: 0, etiqueta: "Sin IVA" },
  { valor: 10, etiqueta: "IVA 10%" },
  { valor: 22, etiqueta: "IVA 22%" },
];

export const CONDICIONES_PAGO = [
  { valor: "immediate", etiqueta: "Contado" },
  { valor: "cod", etiqueta: "Contra entrega" },
  { valor: "net_7", etiqueta: "7 días" },
  { valor: "net_15", etiqueta: "15 días" },
  { valor: "net_30", etiqueta: "30 días" },
  { valor: "net_60", etiqueta: "60 días" },
];

export const etiquetaCondicion = (v) => CONDICIONES_PAGO.find((c) => c.valor === v)?.etiqueta || "";

// Estados: los nuevos son "received" (registrada) y "cancelled" (anulada).
// Los demás son pedidos del sistema anterior que nunca se recibieron.
export const ESTADOS_COMPRA = {
  received:  { etiqueta: "Registrada", clase: "bg-emerald-100 text-emerald-700" },
  cancelled: { etiqueta: "Anulada",    clase: "bg-red-100 text-red-700" },
  draft:     { etiqueta: "Pedido sin recibir", clase: "bg-slate-100 text-slate-600" },
  sent:      { etiqueta: "Pedido sin recibir", clase: "bg-slate-100 text-slate-600" },
  confirmed: { etiqueta: "Pedido sin recibir", clase: "bg-slate-100 text-slate-600" },
};
