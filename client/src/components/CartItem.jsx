import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function CartItem({ item, onUpdateQty, onRemove }) {
  const hasDiscount = item.discount_pct > 0;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{fmt(item.unit_price)} x {item.quantity}</span>
          {hasDiscount && <span className="text-emerald-600 font-medium">-{item.discount_pct}%</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"
          onClick={() => onUpdateQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1}><Minus className="h-3 w-3" /></Button>
        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"
          onClick={() => onUpdateQty(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
      </div>
      <div className="w-20 text-right">
        {hasDiscount && <p className="text-[10px] text-slate-400 line-through">{fmt(item.unit_price * item.quantity)}</p>}
        <p className="text-sm font-bold text-slate-900">{fmt(item.total)}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => onRemove(item.id)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
