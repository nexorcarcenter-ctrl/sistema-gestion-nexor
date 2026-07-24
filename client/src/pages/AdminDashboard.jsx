import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { TrendingUp, DollarSign, ShoppingBag, Percent, Car, ChevronRight, Calendar, Wrench } from "lucide-react";
import * as RechartsPrimitive from "recharts";

const formatCurrency = (n) => `$${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "-";

const PERIOD_OPTIONS = [
  { key: "month", label: "Este mes" },
  { key: "year",  label: "Este año" },
  { key: "all",   label: "Todo" },
];

const STATUS_LABELS = {
  pending: "Pendiente", in_progress: "En proceso",
  ready: "Listo", delivered: "Entregado", cancelled: "Cancelado"
};
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  delivered: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
};

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-5 border border-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg === "bg-white" ? "bg-slate-100" : "bg-white/60"}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    ServiceOrder.list("-createdAt", 200).then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  // Filtrar por período
  const now = new Date();
  const filtered = orders.filter(o => {
    if (o.status === "cancelled") return false;
    if (period === "all") return true;
    const d = new Date(o.createdAt);
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "year") return d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalSale = filtered.reduce((s, o) => s + (Number(o.total_sale) || 0), 0);

  // Separar costos: productos vs mano de obra
  let totalProductCost = 0;
  let totalLaborCost = 0;
  const serviceMap = {};
  filtered.forEach(o => {
    const services = JSON.parse(o.services || "[]");
    services.forEach(s => {
      const prodCost = (s.products || []).reduce((sum, p) => sum + ((Number(p.cost_price) || 0) * (Number(p.quantity) || 1)), 0);
      const labor = Number(s.labor_cost) || 0;
      totalProductCost += prodCost;
      totalLaborCost += labor;
      const profit = (Number(s.sale_price) || 0) - prodCost - labor;
      if (!serviceMap[s.service_name]) {
        serviceMap[s.service_name] = { name: s.service_name, count: 0, sale: 0, profit: 0 };
      }
      serviceMap[s.service_name].count++;
      serviceMap[s.service_name].sale += Number(s.sale_price) || 0;
      serviceMap[s.service_name].profit += profit;
    });
  });
  const totalProfit = totalSale - totalProductCost;
  const margin = totalSale > 0 ? Math.round((totalProfit / totalSale) * 100) : 0;
  const topServices = Object.values(serviceMap).sort((a, b) => b.profit - a.profit).slice(0, 6);

  // Datos para gráfico mensual (últimos 6 meses)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("es-AR", { month: "short" });
    const monthOrders = orders.filter(o => {
      if (o.status === "cancelled") return false;
      const od = new Date(o.createdAt);
      return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
    });
    let mProdCost = 0, mLaborCost = 0;
    monthOrders.forEach(o => {
      const svcs = JSON.parse(o.services || "[]");
      svcs.forEach(s => {
        mProdCost += (s.products || []).reduce((sum, p) => sum + ((Number(p.cost_price) || 0) * (Number(p.quantity) || 1)), 0);
        mLaborCost += Number(s.labor_cost) || 0;
      });
    });
    const mVenta = monthOrders.reduce((s, o) => s + (Number(o.total_sale) || 0), 0);
    monthlyData.push({
      mes: label,
      venta: mVenta,
      "costo prod.": mProdCost,
      "mano obra": mLaborCost,
      utilidad: mVenta - mProdCost,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Administrativo</h1>
          <p className="text-sm text-slate-500">Rentabilidad y métricas del taller</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Cargando...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={DollarSign} label="Total Facturado" value={formatCurrency(totalSale)}
              sub={`${filtered.length} órdenes`} color="text-slate-800" bg="bg-white" />
            <StatCard icon={ShoppingBag} label="Costo Productos" value={formatCurrency(totalProductCost)}
              sub="Insumos y repuestos" color="text-orange-600" bg="bg-orange-50" />
            <StatCard icon={Wrench} label="Costo Servicios" value={formatCurrency(totalLaborCost)}
              sub="Mano de obra" color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={TrendingUp} label="Utilidad" value={formatCurrency(totalProfit)}
              sub={`${margin}% margen s/productos`} color="text-green-600" bg="bg-green-50" />
            <StatCard icon={Percent} label="Margen Productos" value={`${margin}%`}
              sub={totalProfit >= 0 ? "Rentable" : "Pérdida"} color={margin >= 0 ? "text-orange-600" : "text-red-600"} bg="bg-orange-50" />
          </div>

          {/* Gráfico + Top servicios */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Gráfico mensual */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4">Evolución mensual (últimos 6 meses)</h2>
              <RechartsPrimitive.ResponsiveContainer width="100%" height={220}>
                <RechartsPrimitive.BarChart data={monthlyData} barGap={4}>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <RechartsPrimitive.XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <RechartsPrimitive.YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <RechartsPrimitive.Bar dataKey="venta" name="Facturado" fill="#94a3b8" radius={[4,4,0,0]} />
                  <RechartsPrimitive.Bar dataKey="costo prod." name="Costo Prod." fill="#fb923c" radius={[4,4,0,0]} />
                  <RechartsPrimitive.Bar dataKey="mano obra" name="Mano de obra" fill="#60a5fa" radius={[4,4,0,0]} />
                  <RechartsPrimitive.Bar dataKey="utilidad" name="Utilidad" fill="#14b8a6" radius={[4,4,0,0]} />
                  <RechartsPrimitive.Legend wrapperStyle={{ fontSize: 11 }} />
                </RechartsPrimitive.BarChart>
              </RechartsPrimitive.ResponsiveContainer>
            </div>

            {/* Top servicios */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4">Top servicios por utilidad</h2>
              {topServices.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {topServices.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.count} vez{s.count !== 1 ? "es" : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${s.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {formatCurrency(s.profit)}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatCurrency(s.sale)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de órdenes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Detalle por orden</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Vehículo / Cliente</th>
                    <th className="text-left px-4 py-3">Servicios</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-right px-4 py-3">Venta</th>
                    <th className="text-right px-4 py-3">Costo Prod.</th>
                    <th className="text-right px-4 py-3">Utilidad</th>
                    <th className="text-right px-4 py-3">Margen</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        No hay órdenes en este período
                      </td>
                    </tr>
                  ) : filtered.map(o => {
                    const sale = Number(o.total_sale) || 0;
                    const services = JSON.parse(o.services || "[]");
                    const rowProdCost = services.reduce((sum, s) =>
                      sum + (s.products || []).reduce((ps, p) => ps + ((Number(p.cost_price) || 0) * (Number(p.quantity) || 1)), 0), 0);
                    const profit = sale - rowProdCost;
                    const m = sale > 0 ? Math.round((profit / sale) * 100) : 0;
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{o.car_plate}</p>
                          <p className="text-xs text-slate-500">{o.customer_name}</p>
                          <p className="text-xs text-slate-400">{[o.car_brand, o.car_model].filter(Boolean).join(" ")}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {services.map((s, i) => (
                              <span key={i} className="bg-orange-50 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full border border-orange-100">
                                {s.service_name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABELS[o.status] || o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{formatDate(o.entry_date || o.createdAt?.split("T")[0])}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {formatCurrency(o.total_sale)}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600 font-medium">
                          {formatCurrency(rowProdCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(profit)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m >= 30 ? "bg-green-100 text-green-700" : m >= 15 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                            {m}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => navigate(createPageUrl(`ServiceOrderDetail?id=${o.id}`))}
                            className="text-slate-400 hover:text-orange-600 transition-colors">
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-sm border-t-2 border-slate-200">
                      <td className="px-4 py-3 text-slate-600" colSpan={4}>Total ({filtered.length} órdenes)</td>
                      <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(totalSale)}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(totalProductCost)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(totalProfit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${margin >= 30 ? "bg-green-100 text-green-700" : margin >= 15 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                          {margin}%
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}