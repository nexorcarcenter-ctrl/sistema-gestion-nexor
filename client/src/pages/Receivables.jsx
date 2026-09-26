import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Customer, Credito } from "@/entities/Customer";
import { puedeDarDeBaja, rolDelToken } from "@/permissions";
import { Search, Plus, Wallet, CheckCircle2, Users, Phone, MoreVertical, Edit2, Archive, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CobroDialog from "../components/CobroDialog";
import ClienteForm from "../components/ClienteForm";
import { fmtPesos, estadoCobro, textoVencimiento } from "../components/creditFormat";
import { fmtFecha } from "../components/purchaseFormat";

const CLAVES = ["receivables", "credit-customers", "credit-customer", "sale", "sales", "report-summary"];

const Pestana = ({ activa, onClick, children }) => (
  <button onClick={onClick} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activa ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>{children}</button>
);

export default function Receivables() {
  const [vista, setVista] = useState("deudas");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cuentas a cobrar</h1>
        <p className="text-sm text-slate-500">Ventas a crédito: lo que deben los clientes y cuándo vence</p>
      </div>
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <Pestana activa={vista === "deudas"} onClick={() => setVista("deudas")}>A cobrar</Pestana>
        <Pestana activa={vista === "clientes"} onClick={() => setVista("clientes")}>Clientes</Pestana>
      </div>
      {vista === "deudas" ? <ACobrar /> : <Clientes />}
    </div>
  );
}

function useRefrescar() {
  const qc = useQueryClient();
  return () => CLAVES.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

function ACobrar() {
  const refrescar = useRefrescar();
  const [cobrando, setCobrando] = useState(null);
  const { data: deudas = [], isLoading } = useQuery({ queryKey: ["receivables"], queryFn: Credito.aCobrar });

  const vencidas = deudas.filter((d) => d.dias_para_vencer != null && d.dias_para_vencer < 0);
  const proximas = deudas.filter((d) => d.dias_para_vencer != null && d.dias_para_vencer >= 0 && d.dias_para_vencer <= 7);
  const suma = (l) => l.reduce((s, d) => s + d.saldo, 0);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">Total a cobrar</p><p className="text-2xl font-bold text-slate-900">{fmtPesos(suma(deudas))}</p><p className="text-xs text-slate-400">{deudas.length} venta(s)</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">Vencido</p><p className={`text-2xl font-bold ${vencidas.length ? "text-red-600" : "text-slate-900"}`}>{fmtPesos(suma(vencidas))}</p><p className="text-xs text-slate-400">{vencidas.length} venta(s)</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">Vence en 7 días</p><p className={`text-2xl font-bold ${proximas.length ? "text-amber-600" : "text-slate-900"}`}>{fmtPesos(suma(proximas))}</p><p className="text-xs text-slate-400">{proximas.length} venta(s)</p></div>
      </div>
      {deudas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg"><CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" /><p className="text-slate-500">No hay ventas a crédito pendientes de cobro</p></div>
      ) : (
        <div className="space-y-2">
          {deudas.map((d) => {
            const v = textoVencimiento(d.dias_para_vencer, d.due_date);
            return (
              <div key={d.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-100">
                <Link to={createPageUrl("SaleDetail") + "?id=" + d.id} className="flex-1 min-w-0 hover:opacity-80">
                  <p className="text-sm font-semibold text-slate-900">{d.customer_name} <span className="font-mono font-normal text-slate-500 text-xs">{d.sale_number}</span></p>
                  <p className="text-xs">
                    <span className={v.clase}>{v.texto}</span>
                    <span className="text-slate-400"> · venta del {fmtFecha(d.sale_date)} a {d.credit_days} días{d.paid_amount > 0 ? ` · cobrado ${fmtPesos(d.paid_amount)}` : ""}{d.customer_phone ? ` · ${d.customer_phone}` : ""}</span>
                  </p>
                </Link>
                <p className="text-sm font-bold text-red-600 shrink-0">{fmtPesos(d.saldo)}</p>
                <Button size="sm" variant="outline" onClick={() => setCobrando(d)}><Wallet className="h-3.5 w-3.5 mr-1" />Cobrar</Button>
              </div>
            );
          })}
        </div>
      )}
      <CobroDialog venta={cobrando} onClose={() => setCobrando(null)} onCobrado={refrescar} />
    </div>
  );
}

function Clientes() {
  const refrescar = useRefrescar();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null); // null cerrado · {} nuevo · cliente editar
  const [ficha, setFicha] = useState(null);
  const [aArchivar, setAArchivar] = useState(null);
  const puedeArchivar = puedeDarDeBaja(rolDelToken(), "customers");
  const { data: clientes = [], isLoading } = useQuery({ queryKey: ["credit-customers"], queryFn: Customer.conSaldo });

  const archivar = useMutation({
    mutationFn: (id) => Customer.delete(id),
    onSuccess: () => { setAArchivar(null); refrescar(); },
  });

  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    const digitos = q.replace(/\D/g, "");
    return clientes.filter((c) => !q || c.name?.toLowerCase().includes(q) || (digitos && ((c.phone || "").replace(/\D/g, "").includes(digitos) || (c.tax_id || "").replace(/\D/g, "").includes(digitos))));
  }, [clientes, search]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Buscar por nombre, teléfono o RUT" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={() => setForm({})}><Plus className="h-4 w-4 mr-2" />Nuevo cliente</Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.length ? filtrados.map((c) => (
          <Card key={c.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setFicha(c)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{c.name}</h3>
                  <p className="text-xs text-slate-500">{[c.tax_id && `RUT/CI ${c.tax_id}`].filter(Boolean).join(" · ")}</p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setForm(c)}><Edit2 className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                      {puedeArchivar && <DropdownMenuItem className="text-red-600" onClick={() => setAArchivar(c)}><Archive className="h-4 w-4 mr-2" />Archivar</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {c.phone && <p className="mt-2 text-sm text-slate-500 flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</p>}
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                <span className="text-slate-400">Plazo {c.credit_days || 30} días</span>
                <span className="flex items-center gap-1">
                  {c.debe > 0
                    ? <b className={c.vencido > 0 ? "text-red-600" : "text-amber-700"}>Debe {fmtPesos(c.debe)}{c.vencido > 0 ? " · vencido" : ""}</b>
                    : <span className="text-slate-400">Sin deuda</span>}
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12 bg-white rounded-lg"><Users className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">{clientes.length ? "Ningún cliente coincide" : "Todavía no hay clientes: se crean al vender a crédito o desde acá"}</p></div>
        )}
      </div>

      <ClienteForm abierto={form !== null} cliente={form?.id ? form : null} onClose={() => setForm(null)} onGuardado={refrescar} />
      <FichaCliente cliente={ficha} onClose={() => setFicha(null)} />
      <Dialog open={!!aArchivar} onOpenChange={(o) => !o && setAArchivar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>¿Archivar a {aArchivar?.name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Deja de aparecer en la lista y al vender a crédito. Sus ventas y cobros se conservan.</p>
          {aArchivar?.debe > 0 && <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">Todavía debe {fmtPesos(aArchivar.debe)}: sus ventas pendientes siguen en "A cobrar".</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAArchivar(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => archivar.mutate(aArchivar.id)} disabled={archivar.isPending}>Archivar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FichaCliente({ cliente, onClose }) {
  const [vista, setVista] = useState("ventas");
  const { data, isLoading } = useQuery({ queryKey: ["credit-customer", cliente?.id], queryFn: () => Customer.ficha(cliente.id), enabled: !!cliente });
  const c = data?.cliente || cliente;
  const debe = (data?.ventas || []).reduce((s, v) => s + (v.payment_status !== "paid" ? v.saldo : 0), 0);

  return (
    <Dialog open={!!cliente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {c && (
          <>
            <DialogHeader><DialogTitle>{c.name}</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
              {c.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.phone}</p>}
              {c.tax_id && <p>RUT/CI {c.tax_id}</p>}
              {c.email && <p className="truncate">{c.email}</p>}
              {c.address && <p>{c.address}</p>}
              <p>Plazo habitual: {c.credit_days || 30} días</p>
            </div>
            {c.notes && <p className="text-sm text-slate-500 bg-slate-50 rounded p-2">{c.notes}</p>}
            <div className={`rounded-lg p-3 text-sm ${debe > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
              {debe > 0 ? <>Debe <b>{fmtPesos(debe)}</b></> : "No debe nada"}
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
              {[["ventas", "Ventas a crédito"], ["cobros", "Cobros"]].map(([v, e]) => (
                <button key={v} onClick={() => setVista(v)} className={`px-3 py-1.5 text-sm rounded-md ${vista === v ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-500"}`}>{e}</button>
              ))}
            </div>
            {isLoading ? <p className="text-center py-8 text-slate-400 text-sm">Cargando…</p> : vista === "ventas" ? (
              data?.ventas?.length ? (
                <div className="divide-y">
                  {data.ventas.map((v) => {
                    const e = estadoCobro({ ...v, payment_type: "credito" });
                    return (
                      <Link key={v.id} to={createPageUrl("SaleDetail") + "?id=" + v.id} onClick={onClose} className="flex items-center justify-between gap-2 py-2 px-1 rounded hover:bg-slate-50">
                        <div>
                          <p className="text-sm font-mono font-semibold">{v.sale_number} {e && <span className={`ml-1 font-sans text-[10px] font-medium px-1.5 py-0.5 rounded ${e.clase}`}>{e.etiqueta}</span>}</p>
                          <p className="text-xs text-slate-500">{fmtFecha(v.sale_date)} · vence {fmtFecha(v.due_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{fmtPesos(v.total)}</p>
                          {v.saldo > 0.009 && <p className="text-[11px] text-red-600">debe {fmtPesos(v.saldo)}</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : <p className="text-center py-8 text-slate-400 text-sm">Sin ventas a crédito</p>
            ) : (
              data?.cobros?.length ? (
                <div className="divide-y">
                  {data.cobros.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 py-2 px-1">
                      <div>
                        <p className="text-sm">{fmtFecha(p.payment_date)} · {p.payment_method_name || "Sin especificar"}</p>
                        <p className="text-xs text-slate-500">{p.sale_number}{p.notes ? ` · ${p.notes}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{p.currency === "USD" ? `US$ ${p.amount}` : fmtPesos(p.amount)}</p>
                        {p.currency === "USD" && <p className="text-[11px] text-slate-400">{fmtPesos(p.amount_uyu_equivalent)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center py-8 text-slate-400 text-sm">Sin cobros registrados</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
