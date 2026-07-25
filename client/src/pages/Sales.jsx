import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sale } from "@/entities/Sale";
import { PaymentMethod } from "@/entities/PaymentMethod";
import { Search, ShoppingCart, Plus, Wrench, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import moment from "moment";

const fmtUYU = (n) => n ? `$${Number(n).toLocaleString("es-UY", { minimumFractionDigits: 0 })}` : "";
const fmtUSD = (n) => n ? `US$${Number(n).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
const fmtDate = (d) => d ? moment(d).format("DD/MM/YYYY") : "-";

const DATE_FILTERS = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "all", label: "Todo" },
];

export default function Sales() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["sales"],
    queryFn: () => Sale.list("-sale_date", 500),
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => PaymentMethod.filter({ is_active: true }, "sort_order", 50),
  });

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDate = moment(sale.sale_date || sale.createdAt);
      let matchDate = true;
      if (dateFilter === "today") matchDate = saleDate.isSame(moment(), "day");
      else if (dateFilter === "week") matchDate = saleDate.isSame(moment(), "week");
      else if (dateFilter === "month") matchDate = saleDate.isSame(moment(), "month");

      const matchType = typeFilter === "all" || sale.sale_type === typeFilter;

      const matchSearch = !search ||
        sale.sale_number?.toLowerCase().includes(search.toLowerCase()) ||
        sale.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        sale.vehicle?.toLowerCase().includes(search.toLowerCase()) ||
        sale.service_order_number?.toLowerCase().includes(search.toLowerCase());

      return matchDate && matchType && matchSearch && sale.status !== "cancelled";
    });
  }, [sales, dateFilter, typeFilter, search]);

  // Totals per payment method
  const methodTotals = useMemo(() => {
    const totals = {};
    paymentMethods.forEach(m => { totals[m.id] = 0; });
    filteredSales.forEach(sale => {
      const payments = JSON.parse(sale.payments_json || "[]");
      payments.forEach(p => {
        if (totals[p.method_id] !== undefined) {
          totals[p.method_id] += p.currency === "USD" ? p.amount_uyu : p.amount;
        }
      });
    });
    return totals;
  }, [filteredSales, paymentMethods]);

  const grandTotal = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalUSD = filteredSales.reduce((sum, s) => sum + (Number(s.total_usd) || 0), 0);

  if (loadingSales) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ventas Diarias</h1>
          <p className="text-sm text-slate-500">{filteredSales.length} ventas · Total: {fmtUYU(grandTotal)}{totalUSD > 0 ? ` + ${fmtUSD(totalUSD)}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("ServiceOrders"))}>
            <Wrench className="h-4 w-4 mr-1.5" />Nueva Orden
          </Button>
          <Button size="sm" className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={() => navigate(createPageUrl("NewSale"))}>
            <Plus className="h-4 w-4 mr-1.5" />Venta Directa
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente, vehículo, nº venta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64 h-9"
          />
        </div>

        {/* Date filter */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
          {DATE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                dateFilter === f.key
                  ? "bg-[#E8461E] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
          {[["all", "Todas"], ["with_service", "Con servicio"], ["direct", "Directa"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === key
                  ? "bg-[#E8461E] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">FECHA</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">Nº VENTA</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">CLIENTE</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">VEHÍCULO</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">PRODUCTOS</th>
                <th className="text-center px-3 py-2.5 font-semibold text-xs whitespace-nowrap">CANT</th>
                {paymentMethods.map(m => (
                  <th key={m.id} className="text-right px-3 py-2.5 font-semibold text-xs whitespace-nowrap uppercase">
                    {m.name}
                  </th>
                ))}
                <th className="text-right px-3 py-2.5 font-semibold text-xs whitespace-nowrap">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7 + paymentMethods.length} className="text-center py-12 text-slate-400">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No hay ventas para el período seleccionado</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, idx) => {
                  const items = JSON.parse(sale.items_json || "[]");
                  const payments = JSON.parse(sale.payments_json || "[]");
                  const isExpanded = expandedRow === sale.id;

                  // Build payment amounts per method
                  const paymentByMethod = {};
                  payments.forEach(p => {
                    paymentByMethod[p.method_id] = (paymentByMethod[p.method_id] || 0) + p.amount;
                  });

                  const productNames = items.map(i => i.product_name).join(", ") || (sale.sale_type === "with_service" ? "Servicio" : "—");
                  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);

                  return (
                    <>
                      <tr
                        key={sale.id}
                        className={`border-b border-slate-100 cursor-pointer transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        } hover:bg-[#E8461E]/5/40`}
                        onClick={() => setExpandedRow(isExpanded ? null : sale.id)}
                      >
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">{fmtDate(sale.sale_date || sale.createdAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{sale.sale_number}</span>
                            {sale.sale_type === "with_service" && (
                              <span className="text-[10px] bg-[#E8461E]/10 text-[#c73a15] px-1.5 py-0.5 rounded-full font-medium">Servicio</span>
                            )}
                          </div>
                          {sale.service_order_number && (
                            <p className="text-[10px] text-slate-400">Orden #{sale.service_order_number}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{sale.customer_name || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">{sale.vehicle || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-[200px]">
                          <p className="truncate text-xs">{productNames}</p>
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600 text-xs">{totalQty || "—"}</td>
                        {paymentMethods.map(m => {
                          const amt = paymentByMethod[m.id];
                          const isUSD = m.currency === "USD";
                          return (
                            <td key={m.id} className="px-3 py-2 text-right text-xs whitespace-nowrap">
                              {amt ? (
                                <span className={isUSD ? "text-blue-700 font-medium" : "text-slate-700 font-medium"}>
                                  {isUSD ? fmtUSD(amt) : fmtUYU(amt)}
                                </span>
                              ) : ""}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-bold text-slate-800 whitespace-nowrap text-xs">
                          {fmtUYU(sale.total)}
                          {sale.total_usd > 0 && <p className="text-[10px] text-blue-600 font-normal">{fmtUSD(sale.total_usd)}</p>}
                        </td>
                      </tr>
                      {isExpanded && items.length > 0 && (
                        <tr key={`${sale.id}-detail`} className="bg-[#E8461E]/5/60 border-b border-[#E8461E]/10">
                          <td colSpan={7 + paymentMethods.length} className="px-6 py-3">
                            <div className="text-xs text-slate-600">
                              <p className="font-semibold text-slate-700 mb-2">Detalle de ítems:</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {items.map((item, i) => (
                                  <div key={i} className="bg-white rounded-lg px-3 py-2 border border-[#E8461E]/10">
                                    <p className="font-medium text-slate-700">{item.product_name}</p>
                                    <p className="text-slate-500">x{item.quantity} · {fmtUYU(item.unit_price)}</p>
                                  </div>
                                ))}
                              </div>
                              {sale.notes && <p className="mt-2 text-slate-500 italic">Nota: {sale.notes}</p>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
            {filteredSales.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold">
                  <td colSpan={6} className="px-3 py-2.5 text-xs">TOTALES ({filteredSales.length} ventas)</td>
                  {paymentMethods.map(m => (
                    <td key={m.id} className="px-3 py-2.5 text-right text-xs whitespace-nowrap">
                      {methodTotals[m.id] > 0 ? fmtUYU(methodTotals[m.id]) : ""}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap">{fmtUYU(grandTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}