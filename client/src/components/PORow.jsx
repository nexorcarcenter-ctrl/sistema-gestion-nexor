import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Truck, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import moment from "moment";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function PORow({ order }) {
  return (
    <Link
      to={createPageUrl("PurchaseOrderDetail") + "?id=" + order.id}
      className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all group"
    >
      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Truck className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-900 font-mono">{order.po_number}</p>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-slate-500">{order.supplier_name}</span>
          <span className="text-xs text-slate-400">
            {moment(order.order_date || order.createdAt).format("MMM D, YYYY")}
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-slate-900">{fmt(order.total)}</p>
        <p className="text-xs text-slate-400">{order.items_count || 0} items</p>
      </div>
      {order.expected_date && (
        <div className="text-xs text-slate-500 flex-shrink-0">
          ETA: {moment(order.expected_date).format("MMM D")}
        </div>
      )}
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
    </Link>
  );
}
