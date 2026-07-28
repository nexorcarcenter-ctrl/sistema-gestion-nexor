import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Remito } from "@/entities/Remito";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Car, User, Package, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";

const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-UY") : "-";

const STATUS_CONFIG = {
  draft:     { label: "Borrador",  color: "bg-slate-100 text-slate-600 border-slate-200",   icon: Clock },
  issued:    { label: "Emitido",   color: "bg-green-100 text-green-700 border-green-200",   icon: CheckCircle },
  cancelled: { label: "Anulado",   color: "bg-red-100 text-red-600 border-red-200",         icon: XCircle },
};

const FILTERS = [
  { key: "all",       label: "Todos" },
  { key: "draft",     label: "Borradores" },
  { key: "issued",    label: "Emitidos" },
  { key: "cancelled", label: "Anulados" },
];

export default function Remitos() {
  const navigate = useNavigate();
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    Remito.list("-createdAt", 200).then(data => {
      setRemitos(data);
      setLoading(false);
    }).catch(() => setError("Error al cargar datos"));
  }, []);

  const filtered = remitos.filter(r => {
    const matchSearch = !search ||
      r.remito_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.car_plate?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: remitos.length,
    draft: remitos.filter(r => r.status === "draft").length,
    issued: remitos.filter(r => r.status === "issued").length,
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Remitos</h1>
          <p className="text-sm text-slate-500">Salidas de mercadería del depósito</p>
        </div>
        <Button onClick={() => navigate(createPageUrl("NewRemito"))}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Remito
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Borradores", value: stats.draft, color: "text-slate-600", bg: "bg-slate-50" },
          { label: "Emitidos", value: stats.issued, color: "text-green-700", bg: "bg-green-50" },
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
          <Input
            placeholder="Buscar por número, patente, cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === f.key
                  ? "bg-[#E8461E] text-white border-[#E8461E]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No se encontraron remitos</p>
          <Button className="mt-4" onClick={() => navigate(createPageUrl("NewRemito"))}>
            <Plus className="h-4 w-4 mr-2" />Crear primer remito
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(remito => {
            const cfg = STATUS_CONFIG[remito.status] || STATUS_CONFIG.draft;
            const StatusIcon = cfg.icon;
            const items = (() => { try { return JSON.parse(remito.items || "[]"); } catch { return []; } })();
            return (
              <div
                key={remito.id}
                onClick={() => navigate(createPageUrl(`NewRemito?id=${remito.id}`))}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-[#E8461E]/5 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-[#E8461E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">
                          {remito.remito_number || "Sin número"}
                        </span>
                        {remito.order_number && (
                          <span className="text-xs text-slate-400">OS #{remito.order_number}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {remito.car_plate && (
                          <span className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                            <Car className="h-3 w-3 text-slate-400" />{remito.car_plate}
                          </span>
                        )}
                        {remito.customer_name && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <User className="h-3 w-3 text-slate-400" />{remito.customer_name}
                          </span>
                        )}
                        {remito.date && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar className="h-3 w-3" />{fmtDate(remito.date)}
                          </span>
                        )}
                      </div>
                      {items.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Package className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {items.length} ítem{items.length !== 1 ? "s" : ""}:&nbsp;
                            {items.slice(0, 3).map(it => it.product_name).join(", ")}
                            {items.length > 3 ? ` +${items.length - 3} más` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}