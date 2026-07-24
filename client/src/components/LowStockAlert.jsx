import { AlertTriangle } from "lucide-react";
import StockBadge from "./StockBadge";

export default function LowStockAlert({ products = [] }) {
  if (!products.length) return null;

  return (
    <div className="space-y-2">
      {products.slice(0, 5).map((p) => (
        <div key={p.id} className="flex items-center justify-between p-2 bg-amber-50/50 rounded-lg border border-amber-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500 font-mono">{p.sku}</p>
            </div>
          </div>
          <StockBadge quantity={p.stock_quantity} minStock={p.min_stock} />
        </div>
      ))}
      {products.length > 5 && (
        <p className="text-xs text-center text-slate-500 pt-1">
          +{products.length - 5} more items with low stock
        </p>
      )}
    </div>
  );
}
