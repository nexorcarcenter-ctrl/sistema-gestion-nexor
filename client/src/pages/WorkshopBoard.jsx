import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Car, User, Phone, Wrench, Clock, CheckCircle, PlayCircle,
  ChevronRight, Search, RefreshCw, Plus, Package, ArrowRight
} from "lucide-react";

const fmtTime = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" }) : "-";

const STATUS_CONFIG = {
  pending:     { label: "Pendiente",   color: "border-l-yellow-400 bg-yellow-50",  badge: "bg-yellow-100 text-yellow-700", icon: Clock,        next: "in_progress", nextLabel: "▶ Iniciar",   nextColor: "bg-blue-500 hover:bg-blue-600 text-white" },
  in_progress: { label: "En proceso",  color: "border-l-blue-400 bg-blue-50",      badge: "bg-blue-100 text-blue-700",    icon: PlayCircle,   next: "ready",       nextLabel: "✓ Listo",     nextColor: "bg-green-500 hover:bg-green-600 text-white" },
  ready:       { label: "Listo",       color: "border-l-green-400 bg-green-50",    badge: "bg-green-100 text-green-700",  icon: CheckCircle,  next: "delivered",   nextLabel: "↗ Entregar",  nextColor: "bg-slate-600 hover:bg-slate-700 text-white" },
};

const TABS = [
  { key: "all",         label: "Todas" },
  { key: "pending",     label: "Pendientes" },
  { key: "in_progress", label: "En proceso" },
  { key: "ready",       label: "Listos" },
];

function OrderCard({ order, onStatusChange, onNavigate }) {
  const cfg = STATUS_CONFIG[order.status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  const services = (() => { try { return JSON.parse(order.services || "[]"); } catch { return []; } })();
  const [updating, setUpdating] = useState(false);

  const handleNext = async (e) => {
    e.stopPropagation();
    setUpdating(true);
    await ServiceOrder.update(order.id, { status: cfg.next });
    onStatusChange(order.id, cfg.next);
    setUpdating(false);
  };

  return (
    <div
      className={`border-l-4 rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all ${cfg.color} border border-slate-200`}
      onClick={() => onNavigate(order.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 bg-white rounded-xl border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
            <Car className="h-4 w-4 text-[#E8461E]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-800 text-base">{order.carPlate || "Sin patente"}</span>
              {order.orderNumber && <span className="text-xs text-slate-400">#{order.orderNumber}</span>}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {[order.carBrand, order.carModel, order.carYear].filter(Boolean).join(" ") || "—"}
            </p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.badge}`}>
          <Icon className="h-3 w-3" />{cfg.label}
        </span>
      </div>

      {/* Cliente */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {order.customerName && (
          <span className="flex items-center gap-1 text-xs text-slate-600">
            <User className="h-3 w-3 text-slate-400" />{order.customerName}
          </span>
        )}
        {order.customer_phone && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Phone className="h-3 w-3 text-slate-400" />{order.customer_phone}
          </span>
        )}
        {order.entry_date && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />Ingreso: {fmtTime(order.entry_date)}
          </span>
        )}
        {order.delivery_date && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <ArrowRight className="h-3 w-3" />Entrega: {fmtTime(order.delivery_date)}
          </span>
        )}
      </div>

      {/* Servicios */}
      {services.length > 0 && (
        <div className="mb-3 space-y-1">
          {services.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <Wrench className="h-3 w-3 text-[#E8461E] mt-0.5 shrink-0" />
              <span className="text-slate-700 font-medium">{s.service_name}</span>
              {s.products?.length > 0 && (
                <span className="text-slate-400 ml-1 flex items-center gap-0.5">
                  <Package className="h-2.5 w-2.5" />{s.products.length} prod.
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {order.notes && (
        <p className="text-xs text-slate-400 italic mb-3 line-clamp-1">"{order.notes}"</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2">
        <Button
          size="sm"
          className={`flex-1 text-xs font-semibold h-9 ${cfg.nextColor}`}
          onClick={handleNext}
          disabled={updating}
        >
          {updating ? "..." : cfg.nextLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-3 text-xs bg-white"
          onClick={(e) => { e.stopPropagation(); onNavigate(order.id); }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function WorkshopBoard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadOrders = async () => {
    setLoading(true);
    const data = await ServiceOrder.list("-entry_date", 200);
    // Show active orders (not delivered/cancelled)
    const active = data.filter(o => ["pending", "in_progress", "ready"].includes(o.status));
    setOrders(active);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const handleStatusChange = (id, newStatus) => {
    if (newStatus === "delivered") {
      setOrders(prev => prev.filter(o => o.id !== id));
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    }
  };

  const filtered = orders.filter(o => {
    const matchTab = tab === "all" || o.status === tab;
    const matchSearch = !search ||
      o.carPlate?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    in_progress: orders.filter(o => o.status === "in_progress").length,
    ready: orders.filter(o => o.status === "ready").length,
  };

  const tabColors = {
    all: "bg-slate-700 text-white",
    pending: "bg-yellow-500 text-white",
    in_progress: "bg-blue-500 text-white",
    ready: "bg-green-500 text-white",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tablero del Taller</h1>
          <p className="text-sm text-slate-500">
            {orders.length} orden{orders.length !== 1 ? "es" : ""} activa{orders.length !== 1 ? "s" : ""}
            <span className="ml-2 text-slate-400">· Actualizado {lastRefresh.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => navigate(createPageUrl("NewServiceOrder"))}>
            <Plus className="h-4 w-4 mr-1.5" />Nueva Orden
          </Button>
        </div>
      </div>

      {/* Stats + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                tab === t.key
                  ? `${tabColors[t.key]} border-transparent shadow-sm`
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {t.label}
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                tab === t.key ? "bg-white/30" : "bg-slate-100 text-slate-500"
              }`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar patente, cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
          <p>Cargando órdenes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No hay órdenes activas</p>
          <p className="text-sm mt-1">
            {tab !== "all" ? "Probá con otro filtro" : "Todas las órdenes están entregadas o canceladas"}
          </p>
          <Button className="mt-4" onClick={() => navigate(createPageUrl("NewServiceOrder"))}>
            <Plus className="h-4 w-4 mr-2" />Nueva Orden
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Column headers when showing all */}
          {tab === "all" && (
            <>
              {["pending", "in_progress", "ready"].map(status => {
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                const colOrders = filtered.filter(o => o.status === status);
                if (colOrders.length === 0) return null;
                return (
                  <div key={status} className="space-y-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.badge}`}>
                      <Icon className="h-4 w-4" />
                      <span className="font-semibold text-sm">{cfg.label}</span>
                      <span className="ml-auto font-bold">{colOrders.length}</span>
                    </div>
                    {colOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleStatusChange}
                        onNavigate={(id) => navigate(createPageUrl(`ServiceOrderDetail?id=${id}`))}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}
          {tab !== "all" && filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onNavigate={(id) => navigate(createPageUrl(`ServiceOrderDetail?id=${id}`))}
            />
          ))}
        </div>
      )}
    </div>
  );
}