import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { Search, Plus, Truck, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PORow from "../components/PORow";
import PeriodPicker from "../components/PeriodPicker";
import { rangoDelPeriodo } from "@/entities/Report";
import { fmtMoneda, fmtFecha } from "../components/purchaseFormat";
import moment from "moment";

const Pestana = ({ activa, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activa ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
  >
    {children}
  </button>
);

export default function PurchaseOrders() {
  const [vista, setVista] = useState("compras");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compra Directa</h1>
          <p className="text-sm text-slate-500">Lo que se compra suma stock y se anota como gasto de compras</p>
        </div>
        <Link to={createPageUrl("NewPurchaseOrder")}><Button className="bg-[#E8461E] hover:bg-[#c73a15]"><Plus className="h-4 w-4 mr-2" />Nueva compra</Button></Link>
      </div>
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <Pestana activa={vista === "compras"} onClick={() => setVista("compras")}>Compras</Pestana>
        <Pestana activa={vista === "precios"} onClick={() => setVista("precios")}>Comparar precios</Pestana>
      </div>
      {vista === "compras" ? <ListaCompras /> : <ComparadorPrecios />}
    </div>
  );
}

function ListaCompras() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("month");
  const [rango, setRango] = useState(null);
  const [verAnuladas, setVerAnuladas] = useState(false);
  const periodo = rango || rangoDelPeriodo(period);

  const { data: orders = [], isLoading } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => PurchaseOrder.list("-order_date", 2000) });

  const delPeriodo = useMemo(() => orders.filter((o) => {
    const f = moment.utc(o.order_date || o.created_at).format("YYYY-MM-DD");
    return f >= periodo.from && f <= periodo.to;
  }), [orders, periodo.from, periodo.to]);

  const filtradas = useMemo(() => delPeriodo.filter((o) => {
    if (!verAnuladas && o.status === "cancelled") return false;
    const q = search.toLowerCase();
    return !q || o.po_number?.toLowerCase().includes(q) || o.supplier_name?.toLowerCase().includes(q) || o.invoice_number?.toLowerCase().includes(q);
  }), [delPeriodo, search, verAnuladas]);

  const registradas = delPeriodo.filter((o) => o.status === "received");
  // total_uyu es nuevo: las compras viejas no lo tienen, se usa el total tal cual
  const totalPesos = registradas.reduce((s, o) => s + (Number(o.total_uyu) || Number(o.total) || 0), 0);
  const proveedores = new Set(registradas.map((o) => o.supplier_id)).size;
  const anuladas = delPeriodo.filter((o) => o.status === "cancelled").length;

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PeriodPicker periodo={period} rango={rango} onChange={({ periodo: p, rango: r }) => { setPeriod(p); setRango(r); }} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">Compras</p><p className="text-2xl font-bold text-slate-900">{registradas.length}</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">Total en pesos</p><p className="text-2xl font-bold text-[#E8461E]">{fmtMoneda(Math.round(totalPesos), "UYU")}</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">Proveedores</p><p className="text-2xl font-bold text-slate-900">{proveedores}</p></div>
      </div>
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Buscar por número, proveedor o factura" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        {anuladas > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={verAnuladas} onChange={(e) => setVerAnuladas(e.target.checked)} className="rounded" />
            Mostrar anuladas ({anuladas})
          </label>
        )}
      </div>
      <div className="space-y-2">
        {filtradas.length ? filtradas.map((order) => <PORow key={order.id} order={order} />) : (
          <div className="text-center py-12 bg-white rounded-lg"><Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No hay compras en este período</p></div>
        )}
      </div>
    </div>
  );
}

// Por cada producto comprado, qué pagó cada proveedor la última vez, pasado a
// pesos para poder comparar compras en dólares con compras en pesos
function ComparadorPrecios() {
  const [search, setSearch] = useState("");
  const { data: productos = [], isLoading } = useQuery({ queryKey: ["purchase-prices"], queryFn: () => PurchaseOrder.precios() });
  const q = search.toLowerCase();
  const filtrados = productos.filter((p) => !q || p.product_name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      <p className="text-xs text-slate-500">Se compara el último precio que cobró cada proveedor, sin IVA y pasado a pesos con el tipo de cambio de ese día.</p>
      {filtrados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg"><TrendingDown className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">{productos.length ? "Ningún producto coincide" : "Todavía no hay compras registradas para comparar"}</p></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtrados.map((p) => {
            const [mejor] = p.proveedores;
            const peor = p.proveedores[p.proveedores.length - 1];
            const ahorro = p.proveedores.length > 1 ? peor.ultimo_costo_uyu - mejor.ultimo_costo_uyu : 0;
            return (
              <Card key={p.product_id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p.product_name}</p>
                      <p className="text-xs text-slate-500">{p.sku}</p>
                    </div>
                    {ahorro > 0 && <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">Ahorro {fmtMoneda(Math.round(ahorro), "UYU")} /u.</span>}
                  </div>
                  <div className="space-y-1.5">
                    {p.proveedores.map((x, i) => (
                      <div key={x.supplier_id} className={`flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded ${i === 0 && p.proveedores.length > 1 ? "bg-emerald-50" : ""}`}>
                        <div className="min-w-0">
                          <p className={`truncate ${i === 0 && p.proveedores.length > 1 ? "font-semibold text-emerald-800" : "text-slate-700"}`}>
                            {x.supplier_name}{i === 0 && p.proveedores.length > 1 && " · el más barato"}
                          </p>
                          <p className="text-[11px] text-slate-400">Última compra {fmtFecha(x.ultima_fecha)} · {x.compras} compra(s)</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{fmtMoneda(x.ultimo_costo_uyu, "UYU")}</p>
                          {x.ultima_moneda === "USD" && <p className="text-[11px] text-slate-400">{fmtMoneda(x.ultimo_costo, "USD")}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
