import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Receipt, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import moment from "moment";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const PAYMENT_ICONS = {
  cash: "text-emerald-600",
  credit_card: "text-blue-600",
  debit_card: "text-[#E8461E]",
  transfer: "text-amber-600",
};

export default function SaleRow({ sale }) {
  return (
    <Link
      to={createPageUrl("SaleDetail") + "?id=" + sale.id}
      className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all group"
    >
      <div className="w-10 h-10 bg-[#E8461E]/5 rounded-lg flex items-center justify-center flex-shrink-0">
        <Receipt className="h-5 w-5 text-[#E8461E]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-900 font-mono">{sale.sale_number}</p>
          <StatusBadge status={sale.status} />
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-slate-500">{moment(sale.sale_date || sale.createdAt).format("MMM D, h:mm A")}</span>
          {sale.customer_name && <span className="text-xs text-slate-400">{sale.customer_name}</span>}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-slate-900">{fmt(sale.total)}</p>
        <p className={`text-xs capitalize ${PAYMENT_ICONS[sale.payment_method] || "text-slate-400"}`}>
          {sale.payment_method?.replace(/_/g, " ")}
        </p>
      </div>
      <div className="text-xs text-slate-400 flex-shrink-0">
        {sale.items_count || 0} items
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#E8461E] transition-colors" />
    </Link>
  );
}
