import { Package, Percent } from "lucide-react";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
function hasTiers(p) { try { return JSON.parse(p.volume_discounts || "[]").length > 0; } catch { return false; } }

export default function ProductGrid({ products, onAdd }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {products.map((p) => (
        <div key={p.id} className="cursor-pointer bg-white border border-slate-200 rounded-lg p-2 hover:border-orange-300 hover:shadow-md transition-all relative" onClick={() => onAdd(p)}>
          {hasTiers(p) && <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5"><Percent className="h-2.5 w-2.5" /></div>}
          <div className="w-full aspect-[4/3] bg-slate-100 rounded mb-1.5 flex items-center justify-center overflow-hidden">
            {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="h-6 w-6 text-slate-300" />}
          </div>
          <p className="text-xs font-medium text-slate-900 truncate">{p.name}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs font-bold text-[#E8461E]">{fmt(p.unit_price)}</p>
            <p className="text-[10px] text-slate-400">{p.stock_quantity} qty</p>
          </div>
        </div>
      ))}
    </div>
  );
}
