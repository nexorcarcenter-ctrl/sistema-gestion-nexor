import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { Search, Plus, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PORow from "../components/PORow";
import { useLanguage } from "../context/LanguageContext";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function PurchaseOrders() {
  const { t } = useLanguage();
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => PurchaseOrder.list("-createdAt", 500) });

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchSearch = !search || order.po_number?.toLowerCase().includes(search.toLowerCase()) || order.supplier_name?.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === "all" || order.status === statusFilter);
  }), [orders, search, statusFilter]);

  const stats = { total: orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0), pending: orders.filter((o) => ["draft", "sent", "confirmed"].includes(o.status)).length };
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("purchaseOrders")}</h1>
        <Link to={createPageUrl("NewPurchaseOrder")}><Button className="bg-orange-600 hover:bg-orange-700"><Plus className="h-4 w-4 mr-2" />{t("createPO")}</Button></Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">{t("allOrders")}</p><p className="text-2xl font-bold text-slate-900">{orders.length}</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">{t("pending")}</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">{t("totalValue")}</p><p className="text-2xl font-bold text-orange-600">{fmt(stats.total)}</p></div>
      </div>
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder={t("searchOrders")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}><TabsList><TabsTrigger value="all">{t("all")}</TabsTrigger><TabsTrigger value="draft">{t("draft")}</TabsTrigger><TabsTrigger value="sent">{t("sent")}</TabsTrigger><TabsTrigger value="confirmed">{t("confirmed")}</TabsTrigger><TabsTrigger value="received">{t("received")}</TabsTrigger></TabsList></Tabs>
      </div>
      <div className="space-y-2">
        {filteredOrders.length ? filteredOrders.map((order) => <PORow key={order.id} order={order} />) : (
          <div className="text-center py-12 bg-white rounded-lg"><Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">{t("noOrdersFound")}</p></div>
        )}
      </div>
    </div>
  );
}