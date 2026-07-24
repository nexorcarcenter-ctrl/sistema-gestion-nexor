import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StockMovement } from "@/entities/StockMovement";
import { Product } from "@/entities/Product";
import { Search, Plus, ArrowUpCircle, ArrowDownCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StockMovementForm from "../components/StockMovementForm";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const MOVEMENT_STYLES = {
  sale: { icon: ArrowDownCircle, color: "text-red-500", bg: "bg-red-50" },
  purchase: { icon: ArrowUpCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  adjustment: { icon: RefreshCw, color: "text-blue-500", bg: "bg-blue-50" },
  return: { icon: ArrowUpCircle, color: "text-amber-500", bg: "bg-amber-50" },
  damage: { icon: ArrowDownCircle, color: "text-red-500", bg: "bg-red-50" },
  initial: { icon: ArrowUpCircle, color: "text-slate-500", bg: "bg-slate-50" },
};

export default function StockMovements() {
  const { t } = useLanguage();
  const [search, setSearch] = useState(""); const [typeFilter, setTypeFilter] = useState("all"); const [showForm, setShowForm] = useState(false);
  const { data: movements = [], isLoading } = useQuery({ queryKey: ["stock-movements"], queryFn: () => StockMovement.list("-createdAt", 500) });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => Product.list("name", 500) });

  const filteredMovements = useMemo(() => movements.filter((m) => {
    const matchSearch = !search || m.product_name?.toLowerCase().includes(search.toLowerCase()) || m.sku?.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (typeFilter === "all" || m.movement_type === typeFilter);
  }), [movements, search, typeFilter]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("movements")}</h1>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />{t("recordMovement")}</Button>
      </div>
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder={t("searchProducts")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}><TabsList><TabsTrigger value="all">{t("all")}</TabsTrigger><TabsTrigger value="sale">{t("sales")}</TabsTrigger><TabsTrigger value="purchase">{t("purchaseOrders")}</TabsTrigger><TabsTrigger value="adjustment">{t("adjustment")}</TabsTrigger></TabsList></Tabs>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="text-left p-3">{t("date")}</th><th className="text-left p-3">{t("product")}</th><th className="text-left p-3">{t("type")}</th><th className="text-center p-3">{t("quantity")}</th><th className="text-center p-3">{t("stockChange")}</th><th className="text-left p-3">{t("reference")}</th></tr></thead>
            <tbody>
              {filteredMovements.length ? filteredMovements.map((m) => {
                const style = MOVEMENT_STYLES[m.movement_type] || MOVEMENT_STYLES.adjustment;
                const Icon = style.icon;
                return (
                  <tr key={m.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-500">{moment(m.createdAt).format("MMM D, h:mm A")}</td>
                    <td className="p-3"><p className="text-sm font-medium text-slate-900">{m.product_name}</p><p className="text-xs text-slate-500">{m.sku}</p></td>
                    <td className="p-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${style.bg} ${style.color}`}><Icon className="h-3 w-3" />{m.movement_type}</span></td>
                    <td className="p-3 text-center font-mono text-sm"><span className={m.quantity >= 0 ? "text-emerald-600" : "text-red-600"}>{m.quantity >= 0 ? "+" : ""}{m.quantity}</span></td>
                    <td className="p-3 text-center text-sm text-slate-500">{m.previous_stock} → {m.new_stock}</td>
                    <td className="p-3"><p className="text-sm text-slate-600">{m.reason || "-"}</p>{m.reference_number && <p className="text-xs text-slate-400">{m.reference_number}</p>}</td>
                  </tr>
                );
              }) : <tr><td colSpan={6} className="p-8 text-center text-slate-400">{t("noMovementsFound")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <StockMovementForm open={showForm} onOpenChange={setShowForm} products={products} />
    </div>
  );
}