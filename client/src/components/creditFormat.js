import moment from "moment";

export const fmtPesos = (v) => `$ ${Math.round(Number(v) || 0).toLocaleString("es-UY")}`;

// Estado del cobro de una venta a crédito. "Vencida" se deduce de la fecha
// de vencimiento cada vez, no se guarda.
export function estadoCobro(venta) {
  if (!venta || venta.payment_type !== "credito") return null;
  if (venta.payment_status === "paid") return { etiqueta: "Cobrada", clase: "bg-emerald-50 text-emerald-700" };
  const vencida = venta.due_date && moment.utc(venta.due_date).format("YYYY-MM-DD") < moment().format("YYYY-MM-DD");
  if (vencida) return { etiqueta: "Vencida", clase: "bg-red-100 text-red-700" };
  if (venta.payment_status === "partial") return { etiqueta: "Cobro parcial", clase: "bg-amber-100 text-amber-700" };
  return { etiqueta: "A cobrar", clase: "bg-amber-100 text-amber-700" };
}

// Texto del vencimiento para las listas
export function textoVencimiento(dias, fecha) {
  if (dias == null) return { texto: "Sin vencimiento", clase: "text-slate-500" };
  if (dias < 0) return { texto: `Venció hace ${-dias} día(s)`, clase: "text-red-600 font-semibold" };
  if (dias === 0) return { texto: "Vence hoy", clase: "text-red-600 font-semibold" };
  if (dias <= 7) return { texto: `Vence en ${dias} día(s)`, clase: "text-amber-600 font-medium" };
  return { texto: `Vence el ${moment.utc(fecha).format("DD/MM/YYYY")}`, clase: "text-slate-500" };
}
