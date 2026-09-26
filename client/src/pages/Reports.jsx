import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Report } from "@/entities/Report";
import { DollarSign, TrendingUp, ShoppingCart, Percent, Package, Receipt, Scale } from "lucide-react";
import PeriodPicker from "../components/PeriodPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as RC from "recharts";
import StatCard from "../components/StatCard";
import DeltaBadge from "../components/DeltaBadge";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const fmt = (v) => `$${Math.round(Number(v) || 0).toLocaleString("es-UY")}`;
const pct = (v) => `${(Number(v) || 0).toFixed(1)}%`;
const mesCorto = (m) => moment(m, "YYYY-MM").format("MMM");
const COLORES = ["#E8461E", "#14b8a6", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

function Vacio({ children }) {
  return <p className="text-sm text-slate-400 text-center py-10">{children}</p>;
}

export default function Reports() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState("month");
  const [rango, setRango] = useState(null);
  // Lo que se le manda a la API: un rango explícito si hay, si no el atajo
  const consulta = rango || period;
  const claveConsulta = rango ? `${rango.from}_${rango.to}` : period;

  const { data: resumen, isLoading, error } = useQuery({
    queryKey: ["report-summary", claveConsulta],
    queryFn: () => Report.summary(consulta),
  });
  const { data: serie = [] } = useQuery({
    queryKey: ["report-timeseries"],
    queryFn: () => Report.timeseries(6),
  });
  const { data: top } = useQuery({
    queryKey: ["report-top", claveConsulta],
    queryFn: () => Report.top(consulta, 6),
  });

  if (error) {
    // A un usuario sin permisos ya lo tapa ComingSoonGuard: no hace falta
    // mostrarle además un cartel de error debajo del blur.
    if (/administrador/i.test(error.message)) return null;
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        {error.message}
      </div>
    );
  }

  const a = resumen?.actual;
  const prev = resumen?.anterior;
  const inv = resumen?.inventario;
  const sinDatos = !isLoading && a && a.ventas === 0;

  const serieChart = serie.map((s) => ({
    mes: mesCorto(s.mes),
    Ingresos: s.ingresos,
    "Gastos operativos": s.gastos - (s.compras || 0),
    Compras: s.compras || 0,
    Resultado: s.resultado,
  }));

  const composicion = a
    ? [
        { name: t("fromProducts"), value: a.ingresos_productos },
        { name: t("fromServices"), value: a.ingresos_servicios },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("reports")}</h1>
          {resumen && (
            <p className="text-sm text-slate-500">
              {moment(resumen.periodo.desde).format("DD/MM/YYYY")} — {moment(resumen.periodo.hasta).format("DD/MM/YYYY")}
            </p>
          )}
        </div>
        <PeriodPicker
          periodo={period}
          rango={rango}
          onChange={({ periodo, rango: r }) => { setPeriod(periodo); setRango(r); }}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Cargando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title={t("totalRevenue")} value={fmt(a.ingresos)} icon={DollarSign}
              subtitle={<DeltaBadge actual={a.ingresos} anterior={prev?.ingresos} />}
              color="text-[#E8461E]" bgColor="bg-[#E8461E]/5"
            />
            <StatCard
              title="Ganancia s/ lo vendido" value={fmt(a.utilidad)} icon={TrendingUp}
              subtitle={<DeltaBadge actual={a.utilidad} anterior={prev?.utilidad} />}
              color="text-emerald-600" bgColor="bg-emerald-50"
            />
            <StatCard
              title={t("companyExpenses")} value={fmt(a.gastos)} icon={Receipt}
              subtitle={<DeltaBadge actual={a.gastos} anterior={prev?.gastos} invertir />}
              color="text-amber-600" bgColor="bg-amber-50"
            />
            <StatCard
              title={t("netResult")} value={fmt(a.resultado_neto)} icon={Scale}
              subtitle={<DeltaBadge actual={a.resultado_neto} anterior={prev?.resultado_neto} />}
              color={a.resultado_neto >= 0 ? "text-emerald-600" : "text-red-600"}
              bgColor={a.resultado_neto >= 0 ? "bg-emerald-50" : "bg-red-50"}
            />
            <StatCard
              title={t("transactions")} value={a.ventas} icon={ShoppingCart}
              subtitle={`${t("avgTransaction")}: ${fmt(a.ticket_promedio)}`}
              color="text-[#E8461E]" bgColor="bg-[#E8461E]/5"
            />
          </div>

          {sinDatos && <Vacio>{t("noDataPeriod")}</Vacio>}

          <div className="grid lg:grid-cols-3 gap-4">
            {/* 1. Resultado: lo que entró menos todo lo que salió. La mercadería
                se descuenta acá, una sola vez, como compra. */}
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Resultado del período</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 text-slate-600">{t("totalRevenue")}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{fmt(a.ingresos)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500 pl-4">− Gastos operativos</td>
                      <td className="py-2 text-right text-amber-700 tabular-nums">{fmt(a.gastos_operativos)}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 text-slate-500 pl-4">− Compras de mercadería</td>
                      <td className="py-2 text-right text-violet-700 tabular-nums">{fmt(a.compras)}</td>
                    </tr>
                    <tr>
                      <td className={`py-2.5 font-bold ${a.resultado_neto >= 0 ? "text-slate-800" : "text-red-700"}`}>
                        = {t("netResult")}
                      </td>
                      <td className={`py-2.5 text-right text-lg font-bold tabular-nums ${a.resultado_neto >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {fmt(a.resultado_neto)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-slate-400 mt-2">
                  {a.resultado_neto >= 0 ? t("profitLoss") : t("lossLabel")} · {t("netMargin")}: {pct(a.margen_neto)}
                </p>
              </CardContent>
            </Card>

            {/* El valor del stock al lado del resultado: un mes con reposición
                grande da bajo, pero esa plata quedó en el estante, no se perdió */}
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Mercadería en stock</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[#E8461E]">{fmt(inv?.valor_inventario)}</p>
                <p className="text-xs text-slate-500 mt-1">valor a costo de lo que hay hoy en el estante</p>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Las compras restan en el resultado cuando se pagan. Si un mes se repone mucho stock el resultado baja,
                  pero esa plata queda acá, en mercadería para vender.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2. Rentabilidad: cuánto deja lo que se vende. Es informativo y no
              resta en el resultado: el costo ya se descontó al comprar. */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Rentabilidad de lo vendido</CardTitle>
              <p className="text-xs text-slate-400">Informativo: muestra la ganancia de cada venta, no se resta del resultado</p>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase border-b">
                  <tr>
                    <th className="text-left py-2 font-medium"></th>
                    <th className="text-right py-2 font-medium">Venta</th>
                    <th className="text-right py-2 font-medium">Costo</th>
                    <th className="text-right py-2 font-medium">Ganancia</th>
                    <th className="text-right py-2 font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">{t("fromProducts")}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(a.ingresos_productos)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">{fmt(a.costo_productos)}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">{fmt(a.ingresos_productos - a.costo_productos)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">
                      {pct(a.ingresos_productos > 0 ? ((a.ingresos_productos - a.costo_productos) / a.ingresos_productos) * 100 : 0)}
                    </td>
                  </tr>
                  <tr className="border-b-2 border-slate-200">
                    <td className="py-2 text-slate-600">{t("fromServices")} <span className="text-xs text-slate-400">(sin costo)</span></td>
                    <td className="py-2 text-right tabular-nums">{fmt(a.ingresos_servicios)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-400">—</td>
                    <td className="py-2 text-right tabular-nums font-semibold">{fmt(a.ingresos_servicios)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">{a.ingresos_servicios > 0 ? "100.0%" : "—"}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">Ganancia sobre lo vendido</td>
                    <td className="py-2.5 text-right tabular-nums">{fmt(a.ingresos)}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">{fmt(a.costo_productos)}</td>
                    <td className="py-2.5 text-right text-lg font-bold tabular-nums text-emerald-700">{fmt(a.utilidad)}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold">{pct(a.margen)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Evolución + composición */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">{t("monthlyEvolution")}</CardTitle></CardHeader>
              <CardContent>
                <RC.ResponsiveContainer width="100%" height={240}>
                  <RC.BarChart data={serieChart} barGap={4}>
                    <RC.CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <RC.XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <RC.YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <RC.Tooltip formatter={(v) => fmt(v)} />
                    <RC.Legend wrapperStyle={{ fontSize: 11 }} />
                    <RC.Bar dataKey="Ingresos" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <RC.Bar dataKey="Gastos operativos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <RC.Bar dataKey="Compras" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <RC.Bar dataKey="Resultado" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </RC.BarChart>
                </RC.ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("revenueBreakdown")}</CardTitle></CardHeader>
              <CardContent>
                {composicion.length === 0 ? <Vacio>{t("noDataPeriod")}</Vacio> : (
                  <>
                    <RC.ResponsiveContainer width="100%" height={160}>
                      <RC.PieChart>
                        <RC.Pie data={composicion} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                          <RC.Cell fill="#E8461E" />
                          <RC.Cell fill="#14b8a6" />
                        </RC.Pie>
                        <RC.Tooltip formatter={(v) => fmt(v)} />
                      </RC.PieChart>
                    </RC.ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 text-slate-500">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E8461E]" />{t("fromProducts")}
                        </span>
                        <span className="font-bold">{fmt(a.ingresos_productos)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 text-slate-500">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />{t("fromServices")}
                        </span>
                        <span className="font-bold">{fmt(a.ingresos_servicios)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rankings */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("topProductsByProfit")}</CardTitle></CardHeader>
              <CardContent>
                {!top?.productos?.length ? <Vacio>{t("noDataPeriod")}</Vacio> : (
                  <div className="space-y-3">
                    {top.productos.map((p, i) => (
                      <div key={`${p.nombre}-${i}`} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#E8461E]/10 text-[#c73a15] text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{p.nombre}</p>
                          <p className="text-[11px] text-slate-400">{p.cantidad} {t("units")} · {fmt(p.venta)}</p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${p.utilidad < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {fmt(p.utilidad)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("topServicesByRevenue")}</CardTitle></CardHeader>
              <CardContent>
                {!top?.servicios?.length ? <Vacio>{t("noDataPeriod")}</Vacio> : (
                  <div className="space-y-3">
                    {top.servicios.map((s, i) => (
                      <div key={`${s.nombre}-${i}`} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{s.nombre}</p>
                          <p className="text-[11px] text-slate-400">{s.cantidad} {t("sold")}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-700 shrink-0">{fmt(s.venta)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Desglose por categoría y forma de cobro */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("salesByCategory")}</CardTitle></CardHeader>
              <CardContent>
                {!top?.categorias?.length ? <Vacio>{t("noDataPeriod")}</Vacio> : (
                  <RC.ResponsiveContainer width="100%" height={200}>
                    <RC.PieChart>
                      <RC.Pie data={top.categorias} dataKey="venta" nameKey="nombre" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {top.categorias.map((c, i) => <RC.Cell key={c.nombre} fill={COLORES[i % COLORES.length]} />)}
                      </RC.Pie>
                      <RC.Tooltip formatter={(v) => fmt(v)} />
                      <RC.Legend wrapperStyle={{ fontSize: 11 }} />
                    </RC.PieChart>
                  </RC.ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("paymentMethods")}</CardTitle></CardHeader>
              <CardContent>
                {!top?.formas_pago?.length ? <Vacio>{t("noDataPeriod")}</Vacio> : (
                  <div className="space-y-3 pt-1">
                    {top.formas_pago.map((f, i) => {
                      const totalPagos = top.formas_pago.reduce((s2, x) => s2 + x.monto, 0);
                      const porcentaje = totalPagos > 0 ? (f.monto / totalPagos) * 100 : 0;
                      return (
                        <div key={f.nombre}>
                          <div className="flex justify-between items-baseline text-sm mb-1">
                            <span className="text-slate-600 truncate">{f.nombre}</span>
                            <span className="font-bold shrink-0 ml-2">{fmt(f.monto)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, background: COLORES[i % COLORES.length] }} />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{f.operaciones} operaciones · {porcentaje.toFixed(0)}%</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gastos por categoría */}
          {!!top?.gastos?.length && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("expensesByCategory")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {top.gastos.map((g, i) => {
                    const totalG = top.gastos.reduce((s2, x) => s2 + x.monto, 0);
                    const porcentaje = totalG > 0 ? (g.monto / totalG) * 100 : 0;
                    return (
                      <div key={`${g.tipo}-${g.nombre}`}>
                        <div className="flex justify-between items-baseline text-sm mb-1">
                          <span className="text-slate-600 truncate">
                            {g.nombre}
                            {g.tipo === "compra" && <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Compra</span>}
                          </span>
                          <span className="font-bold shrink-0 ml-2">{fmt(g.monto)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${g.tipo === "compra" ? "bg-violet-500" : "bg-amber-500"}`} style={{ width: `${porcentaje}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{g.cantidad} gasto(s) · {porcentaje.toFixed(0)}%</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventario */}
          {inv && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("inventorySummary")}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">{t("totalProducts")}</p>
                  <p className="text-xl font-bold text-slate-800">{inv.productos}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t("inventoryValue")}</p>
                  <p className="text-xl font-bold text-[#E8461E]">{fmt(inv.valor_inventario)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t("lowStock")}</p>
                  <p className={`text-xl font-bold ${inv.stock_bajo > 0 ? "text-amber-600" : "text-slate-800"}`}>{inv.stock_bajo}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
