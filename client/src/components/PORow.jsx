import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Truck, ChevronRight } from "lucide-react";
import { fmtMoneda, fmtFecha, ESTADOS_COMPRA } from "./purchaseFormat";

export default function PORow({ order }) {
  const estado = ESTADOS_COMPRA[order.status] || { etiqueta: order.status, clase: "bg-slate-100 text-slate-600" };
  const moneda = order.currency || "UYU";
  const anulada = order.status === "cancelled";
  return (
    <Link
      to={createPageUrl("PurchaseOrderDetail") + "?id=" + order.id}
      className={`flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all group ${anulada ? "opacity-60" : ""}`}
    >
      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Truck className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-slate-900 font-mono">{order.po_number}</p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${estado.clase}`}>{estado.etiqueta}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {[order.supplier_name, fmtFecha(order.order_date || order.created_at), order.payment_method_name].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold text-slate-900 ${anulada ? "line-through" : ""}`}>{fmtMoneda(order.total, moneda)}</p>
        <p className="text-xs text-slate-400">{order.items_count || 0} u.{moneda === "USD" && order.total_uyu ? ` · ${fmtMoneda(order.total_uyu, "UYU")}` : ""}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#E8461E] transition-colors" />
    </Link>
  );
}
