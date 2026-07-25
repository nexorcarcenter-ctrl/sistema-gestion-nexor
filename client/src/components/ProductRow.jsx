import { useState } from "react";
import { Edit2, Trash2, Package, Car, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StockBadge from "./StockBadge";

const fmt = (v) => `$${(v || 0).toLocaleString("es-UY", { minimumFractionDigits: 0 })}`;

const STATUS_STYLES = {
  active:       "bg-green-100 text-green-700",
  inactive:     "bg-slate-100 text-slate-500",
  discontinued: "bg-red-100 text-red-600",
};
const STATUS_LABELS = {
  active: "Activo",
  inactive: "Inactivo",
  discontinued: "Descontinuado",
};

export default function ProductRow({ product, onEdit, onDelete, onAddStock }) {
  const [showAddStock, setShowAddStock] = useState(false);
  const [addQty, setAddQty] = useState("");
  const [adding, setAdding] = useState(false);
  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      {/* Nombre */}
      <td className="px-4 py-3 max-w-[220px]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
            {product.imageUrl
              ? <img src={product.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover" />
              : <Package className="h-4 w-4 text-slate-400" />}
          </div>
          <span className="text-sm font-medium text-slate-800 truncate" title={product.name}>
            {product.name}
          </span>
        </div>
      </td>

      {/* SKU */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-mono text-slate-500">{product.sku || "—"}</span>
      </td>

      {/* Categoría */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-sm text-slate-600">{product.category || "—"}</span>
      </td>

      {/* Vehículo */}
      <td className="px-4 py-3 whitespace-nowrap">
        {(product.carBrand || product.carModel) ? (
          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            <Car className="h-3 w-3" />
            {[product.carBrand, product.carModel, product.carYear].filter(Boolean).join(" ")}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>

      {/* Precio venta */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <span className="text-sm font-semibold text-[#E8461E]">{fmt(product.unitPrice)}</span>
      </td>

      {/* Precio costo */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <span className="text-sm text-slate-500">{fmt(product.costPrice)}</span>
      </td>

      {/* Stock */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <StockBadge quantity={product.stockQuantity} minStock={product.minStock} />
          {!showAddStock && (
            <button
              onClick={() => { setShowAddStock(true); setAddQty(""); }}
              className="w-5 h-5 rounded bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center transition-colors"
              title="Agregar stock"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
          {showAddStock && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="1"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                className="w-16 h-6 text-xs px-1.5"
                placeholder="Cant."
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter" && parseInt(addQty) > 0) {
                    setAdding(true);
                    onAddStock?.(product, parseInt(addQty)).then(() => {
                      setShowAddStock(false); setAdding(false);
                    });
                  }
                  if (e.key === "Escape") setShowAddStock(false);
                }}
              />
              <button
                disabled={adding || !parseInt(addQty)}
                onClick={() => {
                  if (parseInt(addQty) > 0) {
                    setAdding(true);
                    onAddStock?.(product, parseInt(addQty)).then(() => {
                      setShowAddStock(false); setAdding(false);
                    });
                  }
                }}
                className="w-5 h-5 rounded bg-green-500 hover:bg-green-600 text-white flex items-center justify-center disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={() => setShowAddStock(false)}
                className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-500 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </td>

      {/* Proveedor */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs text-slate-500 truncate max-w-[120px] block">{product.supplierName || "—"}</span>
      </td>

      {/* Estado */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[product.status] || STATUS_STYLES.inactive}`}>
          {STATUS_LABELS[product.status] || product.status}
        </span>
      </td>

      {/* Acciones */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit?.(product)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-[#E8461E]/10 text-slate-600 hover:text-[#c73a15] text-xs font-medium transition-colors"
          >
            <Edit2 className="h-3 w-3" />Editar
          </button>
          <button
            onClick={() => onDelete?.(product.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 text-xs font-medium transition-colors"
          >
            <Trash2 className="h-3 w-3" />Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}
