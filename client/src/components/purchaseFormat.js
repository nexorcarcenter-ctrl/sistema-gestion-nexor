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
  { valor: "net_45", etiqueta: "45 días" },
  { valor: "net_60", etiqueta: "60 días" },
  { valor: "net_90", etiqueta: "90 días" },
];

// Plazos de crédito que se ofrecen al registrar una compra
export const PLAZOS_CREDITO = [7, 15, 30, 45, 60, 90];

// La condición del proveedor ("net_30") propone el plazo de la compra
export const diasDeCondicion = (condicion) => {
  const m = /^net_(\d+)$/.exec(condicion || "");
  return m ? Number(m[1]) : 0;
};

// Estado del pago de una compra. "Vencida" no se guarda: se deduce de la
// fecha de vencimiento cada vez que se muestra.
export function estadoPago(compra) {
  if (!compra || compra.status !== "received") return null;
  if (compra.payment_status === "paid") return { etiqueta: compra.payment_type === "credito" ? "Pagada" : "Contado", clase: "bg-emerald-50 text-emerald-700" };
  const vencida = compra.due_date && moment.utc(compra.due_date).format("YYYY-MM-DD") < moment().format("YYYY-MM-DD");
  if (vencida) return { etiqueta: "Vencida", clase: "bg-red-100 text-red-700" };
  if (compra.payment_status === "partial") return { etiqueta: "Pago parcial", clase: "bg-amber-100 text-amber-700" };
  return { etiqueta: "A pagar", clase: "bg-amber-100 text-amber-700" };
}

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
