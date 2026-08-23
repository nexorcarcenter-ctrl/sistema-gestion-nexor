import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Report } from "@/entities/Report";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { DollarSign, TrendingUp, ShoppingBag, Wrench, Car, ChevronRight } from "lucide-react";
import * as RC from "recharts";
import StatCard from "../components/StatCard";
import DeltaBadge from "../components/DeltaBadge";
import moment from "moment";

const fmt = (v) => `$${Math.round(Number(v) || 0).toLocaleString("es-UY")}`;
const mesCorto = (m) => moment(m, "YYYY-MM").format("MMM");

const PERIODOS = [
  { key: "month", label: "Este mes" },
  { key: "year", label: "Este año" },
];

const STATUS_LABELS = {
  pending: "Pendiente", in_progress: "En proceso",
  ready: "Listo", delivered: "Entregado", cancelled: "Cancelado",
};
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  delivered: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("month");

  const { data: resumen, isLoading, error } = useQuery({
    queryKey: ["report-summary", period],
    queryFn: () => Report.summary(period),
  });
  const { data: top } = useQuery({
    queryKey: ["report-top", period],
    queryFn: () => Report.top(period, 8),
  });
  const { data: serie = [] } = useQuery({
    queryKey: ["report-timeseries"],
    queryFn: () => Report.timeseries(6),
  });
  const { data: ordenes = [] } = useQuery({
    queryKey: ["service-orders-recientes"],
    queryFn: () => ServiceOrder.list("-createdAt", 8),
  });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        {error.message}
      </div>
    );
  }

  const a = resumen?.actual;
  const prev = resumen?.anterior;
  const serieChart = serie.map((s) => ({ mes: mesCorto(s.mes), Ingresos: s.ingresos, Utilidad: s.utilidad }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Administrativo</h1>
          <p className="text-sm text-slate-500">Rentabilidad y métricas del taller</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Cargando...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Facturado" value={fmt(a.ingresos)} icon={DollarSign}
              subtitle={<DeltaBadge actual={a.ingresos} anterior={prev?.ingresos} />}
              color="text-slate-700" bgColor="bg-slate-100"
            />
            <StatCard
              title="Costo Productos" value={fmt(a.costo_productos)} icon={ShoppingBag}
              subtitle="Insumos y repuestos"
              color="text-amber-600" bgColor="bg-amber-50"
            />
            <StatCard
              title="Mano de Obra Facturada" value={fmt(a.ingresos_servicios)} icon={Wrench}
              subtitle="Ingreso sin costo asociado"
              color="text-blue-600" bgColor="bg-blue-50"
            />
            <StatCard
              title="Utilidad" value={fmt(a.utilidad)} icon={TrendingUp}
              subtitle={`${a.margen.toFixed(1)}% de margen`}
              color="text-emerald-600" bgColor="bg-emerald-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4">Evolución mensual (últimos 6 meses)</h2>
              <RC.ResponsiveContainer width="100%" height={220}>
                <RC.BarChart data={serieChart} barGap={4}>
                  <RC.CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <RC.XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <RC.YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <RC.Tooltip formatter={(v) => fmt(v)} />
                  <RC.Legend wrapperStyle={{ fontSize: 11 }} />
                  <RC.Bar dataKey="Ingresos" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <RC.Bar dataKey="Utilidad" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </RC.BarChart>
              </RC.ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4">Top servicios por facturación</h2>
              {!top?.servicios?.length ? (
                <p className="text-sm text-slate-400 text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {top.servicios.map((s, i) => (
                    <div key={`${s.nombre}-${i}`} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#E8461E]/10 text-[#c73a15] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{s.nombre}</p>
                        <p className="text-[11px] text-slate-400">{s.cantidad} realizados</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 shrink-0">{fmt(s.venta)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Últimas órdenes de servicio</h2>
            {!ordenes.length ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin órdenes</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {ordenes.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => navigate(createPageUrl(`ServiceOrderDetail?id=${o.id}`))}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <Car className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {o.order_number} · {o.customer_name || "Sin cliente"}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {[o.car_brand, o.car_model, o.car_plate].filter(Boolean).join(" · ") || "Sin vehículo"}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[o.status] || "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
