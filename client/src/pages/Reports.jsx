import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sale } from "@/entities/Sale";
import { Product } from "@/entities/Product";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { DollarSign, TrendingUp, ShoppingCart, Percent } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SalesChart from "../components/SalesChart";
import StatCard from "../components/StatCard";
import CategoryPieChart from "../components/CategoryPieChart";
import PaymentPieChart from "../components/PaymentPieChart";
import ReportSummaryCards from "../components/ReportSummaryCards";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function Reports() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState("month");
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: () => Sale.list("-createdAt", 1000) });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => Product.list("name", 500) });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => PurchaseOrder.list("-createdAt", 500) });

  const filteredSales = useMemo(() => sales.filter((s) => {
    if (s.status !== "completed") return false;
    const d = moment(s.sale_date || s.createdAt);
    if (period === "today") return d.isSame(moment(), "day");
    if (period === "week") return d.isSame(moment(), "week");
    if (period === "month") return d.isSame(moment(), "month");
    return d.isSame(moment(), "year");
  }), [sales, period]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalCost = filteredSales.reduce((sum, s) => {
    try {
      const items = JSON.parse(s.items_json || "[]");
      return sum + items.reduce((iSum, item) => {
        const product = products.find((p) => p.id === item.product_id);
        return iSum + ((product?.cost_price || 0) * (item.quantity || 0));
      }, 0);
    } catch { return sum; }
  }, 0);
  const grossProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
  const avgTransaction = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("reports")}</h1>
        <Tabs value={period} onValueChange={setPeriod}><TabsList><TabsTrigger value="today">{t("today")}</TabsTrigger><TabsTrigger value="week">{t("thisWeek")}</TabsTrigger><TabsTrigger value="month">{t("thisMonth")}</TabsTrigger><TabsTrigger value="year">{t("thisYear")}</TabsTrigger></TabsList></Tabs>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("totalRevenue")} value={fmt(totalRevenue)} icon={DollarSign} color="text-orange-600" bgColor="bg-orange-50" />
        <StatCard title={t("grossProfit")} value={fmt(grossProfit)} icon={TrendingUp} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard title={t("profitMargin")} value={`${profitMargin}%`} icon={Percent} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title={t("transactions")} value={filteredSales.length} subtitle={`${t("avgTransaction")}: ${fmt(avgTransaction)}`} icon={ShoppingCart} color="text-orange-600" bgColor="bg-orange-50" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <SalesChart sales={sales} title={t("salesTrend")} />
        <CategoryPieChart sales={filteredSales} products={products} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <PaymentPieChart sales={filteredSales} />
        <ReportSummaryCards products={products} purchaseOrders={purchaseOrders} />
      </div>
    </div>
  );
}
