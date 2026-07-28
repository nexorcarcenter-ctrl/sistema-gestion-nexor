import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Car, User, Phone, Calendar, Clock, CheckCircle, Wrench, XCircle, DollarSign, ClipboardCheck } from "lucide-react";

const formatCurrency = (n) => `$${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : "-";

const STATUS_CONFIG = {
  pending:     { label: "Pendiente",    color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  in_progress: { label: "En proceso",  color: "bg-blue-100 text-blue-700 border-blue-200",   icon: Wrench },
  ready:       { label: "Listo",        color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  delivered:   { label: "Entregado",   color: "bg-slate-100 text-slate-600 border-slate-200", icon: CheckCircle },
  cancelled:   { label: "Cancelado",   color: "bg-red-100 text-red-600 border-red-200",       icon: XCircle },
};

const PAYMENT_STATUS_CONFIG = {
  unpaid:  { label: "Sin pagar",    color: "bg-red-100 text-red-700 border-red-200" },
  partial: { label: "Pago parcial", color: "bg-amber-100 text-amber-700 border-amber-200" },
  paid:    { label: "Pagado",       color: "bg-green-100 text-green-700 border-green-200" },
};

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendientes" },
  { key: "in_progress", label: "En proceso" },
  { key: "ready", label: "Listos" },
  { key: "delivered", label: "Entregados" },
];

export default function ServiceOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    ServiceOrder.list("-createdAt", 100).then(data => {
      setOrders(data);
      setLoading(false);
    }).catch(() => setError("Error al cargar datos"));
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.carPlate?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.carBrand?.toLowerCase().includes(search.toLowerCase()) ||
      o.carModel?.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    in_progress: orders.filter(o => o.status === "in_progress").length,
    ready: orders.filter(o => o.status === "ready").length,
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Órdenes de Servicio</h1>
          <p className="text-sm text-slate-500">Gestión de trabajos del taller</p>
        </div>
        <Button onClick={() => navigate(createPageUrl("NewServiceOrder"))}>
          <Plus className="h-4 w-4 mr-2" />Nueva Orden
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Pendientes", value: stats.pending, color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: "En proceso", value: stats.in_progress, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Listos", value: stats.ready, color: "text-green-700", bg: "bg-green-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar por patente, cliente, marca..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === f.key
                  ? "bg-[#E8461E] text-white border-[#E8461E]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No se encontraron órdenes</p>
          <Button className="mt-4" onClick={() => navigate(createPageUrl("NewServiceOrder"))}>
            <Plus className="h-4 w-4 mr-2" />Crear primera orden
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const services = JSON.parse(order.services || "[]");
            const payCfg = PAYMENT_STATUS_CONFIG[order.paymentStatus || "unpaid"];
            const isInspected = order.inspectionStatus === "inspected";

            return (
              <div key={order.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all">
                <div
                  onClick={() => navigate(createPageUrl(`ServiceOrderDetail?id=${order.id}`))}
                  className="p-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-[#E8461E]/10 rounded-xl flex items-center justify-center shrink-0">
                        <Car className="h-5 w-5 text-[#E8461E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">
                            {order.carPlate || "Sin patente"}
                          </span>
                          {order.orderNumber && (
                            <span className="text-xs text-slate-400">#{order.orderNumber}</span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" />{cfg.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${payCfg.color}`}>
                            <DollarSign className="h-3 w-3" />{payCfg.label}
                          </span>
                          {/* Badge inspección */}
                          {isInspected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-green-50 text-green-700 border-green-200">
                              <ClipboardCheck className="h-3 w-3" />Inspeccionado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-slate-50 text-slate-500 border-slate-200">
                              <Clock className="h-3 w-3" />Sin inspección
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {[order.carBrand, order.carModel, order.carYear].filter(Boolean).join(" ")}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {order.customerName && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <User className="h-3 w-3" />{order.customerName}
                            </span>
                          )}
                          {order.customer_phone && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="h-3 w-3" />{order.customer_phone}
                            </span>
                          )}
                          {/* Fecha + hora de cita */}
                          {order.entry_date && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="h-3 w-3" />{formatDate(order.entry_date)}
                            </span>
                          )}
                          {order.appointment_time && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-[#E8461E] bg-[#E8461E]/5 px-2 py-0.5 rounded-full border border-orange-200">
                              <Clock className="h-3 w-3" />{order.appointment_time} hs
                            </span>
                          )}
                        </div>
                        {services.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {services.map((s, i) => (
                              <span key={i} className="bg-[#E8461E]/5 text-[#c73a15] text-[11px] px-2 py-0.5 rounded-full border border-[#E8461E]/10">
                                {s.service_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-slate-800">{formatCurrency(order.totalSale)}</p>
                    </div>
                  </div>
                </div>

                {/* Botón inspeccionar */}
                {!isInspected && order.status !== "cancelled" && (
                  <div className="px-4 pb-3 pt-0 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(createPageUrl(`InspectionPage?id=${order.id}`));
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold transition-colors"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Realizar Inspección al Ingreso
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}