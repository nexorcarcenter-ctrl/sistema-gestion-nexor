import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sale } from "@/entities/Sale";
import { Product } from "@/entities/Product";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { DollarSign, Package, AlertTriangle, Truck, ArrowRight } from "lucide-react";
import StatCard from "../components/StatCard";
import SalesChart from "../components/SalesChart";
import TopProductsChart from "../components/TopProductsChart";
import LowStockAlert from "../components/LowStockAlert";
import SaleRow from "../components/SaleRow";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: () => Sale.list("-createdAt", 500) });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => Product.filter({ is_active: true }, "name", 500) });
  const { data: orders = [] } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => PurchaseOrder.list("-createdAt", 100) });

  const today = moment().startOf("day");
  const todaySales = sales.filter((s) => moment(s.sale_date || s.createdAt).isSameOrAfter(today) && s.status === "completed");
  const todayRevenue = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const lowStock = products.filter((p) => p.stock_quantity <= p.min_stock);
  const pendingPOs = orders.filter((o) => ["draft", "sent", "confirmed"].includes(o.status));
  const recentSales = sales.filter((s) => s.status === "completed").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("dashboard")}</h1>
        <Link to={createPageUrl("PointOfSale")} className="flex items-center gap-2 px-4 py-2 bg-[#E8461E] hover:bg-[#c73a15] text-white rounded-lg text-sm font-medium transition-colors">
          {t("newSale")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("todaySales")} value={fmt(todayRevenue)} subtitle={`${todaySales.length} ${t("transactions").toLowerCase()}`} icon={DollarSign} color="text-[#E8461E]" bgColor="bg-[#E8461E]/5" />
        <StatCard title={t("totalProducts")} value={products.length} subtitle={`${products.filter(p => p.status === 'active').length} ${t("active").toLowerCase()}`} icon={Package} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title={t("lowStock")} value={lowStock.length} icon={AlertTriangle} color="text-amber-600" bgColor="bg-amber-50" />
        <StatCard title={t("pendingOrders")} value={pendingPOs.length} icon={Truck} color="text-[#E8461E]" bgColor="bg-[#E8461E]/5" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <SalesChart sales={sales} title={t("salesTrend")} />
        <TopProductsChart sales={sales} title={t("topProducts")} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">{t("recentSales")}</h3>
            <Link to={createPageUrl("Sales")} className="text-xs text-[#E8461E] hover:text-[#c73a15] font-medium">{t("viewAll")}</Link>
          </div>
          <div className="space-y-2">
            {recentSales.length ? recentSales.map((sale) => <SaleRow key={sale.id} sale={sale} />) : (
              <p className="text-xs text-slate-400 text-center py-4">{t("noSalesYet")}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">{t("lowStockAlerts")}</h3>
            <Link to={createPageUrl("Products")} className="text-xs text-[#E8461E] hover:text-[#c73a15] font-medium">{t("viewAll")}</Link>
          </div>
          <LowStockAlert products={lowStock} />
          {!lowStock.length && <p className="text-xs text-slate-400 text-center py-4">{t("allWellStocked")}</p>}
        </div>
      </div>
    </div>
  );
}
