import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sale } from "@/entities/Sale";
import { Product } from "@/entities/Product";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { Appointment } from "@/entities/Appointment";
import { DollarSign, Wrench, CalendarClock, AlertTriangle, ArrowRight } from "lucide-react";
import StatCard from "../components/StatCard";
import SalesChart from "../components/SalesChart";
import TopProductsChart from "../components/TopProductsChart";
import LowStockAlert from "../components/LowStockAlert";
import SaleRow from "../components/SaleRow";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const fmt = (v) => `$${Math.round(Number(v) || 0).toLocaleString("es-UY")}`;

// Estados de una orden que todavía está en el taller
const ESTADOS_ACTIVOS = ["pending", "in_progress", "ready"];

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: () => Sale.list("-createdAt", 500) });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => Product.filter({ is_active: true }, "name", 500) });
  const { data: serviceOrders = [] } = useQuery({ queryKey: ["service-orders"], queryFn: () => ServiceOrder.list("-createdAt", 200) });
  const { data: appointments = [] } = useQuery({ queryKey: ["appointments"], queryFn: () => Appointment.list("-date", 200) });

  const hoy = moment().startOf("day");
  const hoyStr = hoy.format("YYYY-MM-DD");

  const ventasHoy = sales.filter((s) => s.status === "completed" && moment(s.sale_date || s.createdAt).isSameOrAfter(hoy));
  const facturadoHoy = ventasHoy.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const ordenesActivas = serviceOrders.filter((o) => ESTADOS_ACTIVOS.includes(o.status));
  const enProceso = ordenesActivas.filter((o) => o.status === "in_progress").length;
  const listas = ordenesActivas.filter((o) => o.status === "ready").length;

  const turnosHoy = appointments.filter((a) => {
    const fecha = a.date ? moment(a.date).format("YYYY-MM-DD") : null;
    return fecha === hoyStr && a.status !== "cancelado";
  });

  const lowStock = products.filter((p) => p.stock_quantity <= p.min_stock);
  const recentSales = sales.filter((s) => s.status === "completed").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("dashboard")}</h1>
        <Link
          to={createPageUrl("PointOfSale")}
          className="flex items-center gap-2 px-4 py-2 bg-[#E8461E] hover:bg-[#c73a15] text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t("newSale")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("todaySales")} value={fmt(facturadoHoy)}
          subtitle={`${ventasHoy.length} ${t("transactions").toLowerCase()}`}
          icon={DollarSign} color="text-[#E8461E]" bgColor="bg-[#E8461E]/5"
        />
        <StatCard
          title={t("activeOrders")} value={ordenesActivas.length}
          subtitle={`${enProceso} en proceso · ${listas} listas`}
          icon={Wrench} color="text-blue-600" bgColor="bg-blue-50"
        />
        <StatCard
          title={t("todayAppointments")} value={turnosHoy.length}
          subtitle={turnosHoy.length ? turnosHoy.map((a) => a.time).filter(Boolean).slice(0, 3).join(" · ") : "Sin turnos"}
          icon={CalendarClock} color="text-teal-600" bgColor="bg-teal-50"
        />
        <StatCard
          title={t("lowStock")} value={lowStock.length}
          subtitle={lowStock.length ? "Requieren reposición" : t("allWellStocked")}
          icon={AlertTriangle} color="text-amber-600" bgColor="bg-amber-50"
        />
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
