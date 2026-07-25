import { useState } from "react";
import { Search, Package, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../context/LanguageContext";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function POItemsEditor({ products, items, onItemsChange }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  const addItem = (product) => {
    if (items.find((i) => i.product_id === product.id)) return;
    onItemsChange([...items, { product_id: product.id, product_name: product.name, sku: product.sku, quantity: 1, unit_cost: product.cost_price || 0, total: product.cost_price || 0 }]);
    setSearch("");
  };

  const updateItem = (idx, field, value) => {
    onItemsChange(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.total = updated.quantity * updated.unit_cost;
      return updated;
    }));
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-sm">{t("items")}</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder={t("searchProducts")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </CardHeader>
      <CardContent>
        {search && (
          <div className="mb-4 max-h-48 overflow-y-auto border rounded-lg divide-y">
            {filtered.slice(0, 10).map((p) => (
              <button key={p.id} className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 text-left" onClick={() => addItem(p)}>
                <Package className="h-4 w-4 text-slate-400" />
                <div className="flex-1"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.sku}</p></div>
                <span className="text-sm text-[#E8461E]">{fmt(p.cost_price)}</span>
              </button>
            ))}
          </div>
        )}
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="text-xs text-slate-500 uppercase border-b">
                <tr>
                  <th className="text-left py-2">{t("product")}</th>
                  <th className="text-center py-2 w-24">{t("quantity")}</th>
                  <th className="text-right py-2 w-28">{t("cost")}</th>
                  <th className="text-right py-2 w-28">{t("total")}</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2"><p className="text-sm font-medium">{item.product_name}</p><p className="text-xs text-slate-500">{item.sku}</p></td>
                    <td className="text-center"><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="w-20 text-center mx-auto h-8" /></td>
                    <td className="text-right"><Input type="number" step="0.01" value={item.unit_cost} onChange={(e) => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)} className="w-24 text-right ml-auto h-8" /></td>
                    <td className="text-right font-medium">{fmt(item.total)}</td>
                    <td><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onItemsChange(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-center py-8 text-slate-400">{t("searchAndAdd")}</p>}
      </CardContent>
    </Card>
  );
}