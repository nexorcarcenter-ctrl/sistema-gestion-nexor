import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Supplier } from "@/entities/Supplier";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { Search, Plus, Users, Phone, Mail, MapPin, MoreVertical, Edit2, Archive, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SupplierForm from "../components/SupplierForm";
import { fmtMoneda, fmtFecha, etiquetaCondicion, ESTADOS_COMPRA } from "../components/purchaseFormat";

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [aArchivar, setAArchivar] = useState(null);

  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ["suppliers", "activos"], queryFn: () => Supplier.filter({ is_active: true }, "name", 500) });

  const saveMutation = useMutation({
    mutationFn: (data) => editSupplier ? Supplier.update(editSupplier.id, data) : Supplier.create({ ...data, is_active: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setShowForm(false); setEditSupplier(null); },
  });
  // Se archiva, no se borra: sus compras y precios siguen en el historial
  const archiveMutation = useMutation({
    mutationFn: (id) => Supplier.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setAArchivar(null); },
  });

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((s) => !q || s.name?.toLowerCase().includes(q) || s.contact_name?.toLowerCase().includes(q) || s.tax_id?.toLowerCase().includes(q));
  }, [suppliers, search]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
        <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={() => { saveMutation.reset(); setEditSupplier(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" />Nuevo proveedor</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Buscar por nombre, contacto o RUT" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.length ? filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setFicha(supplier)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{supplier.name}</h3>
                  <p className="text-xs text-slate-500">{[supplier.contact_name, supplier.tax_id && `RUT ${supplier.tax_id}`].filter(Boolean).join(" · ")}</p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { saveMutation.reset(); setEditSupplier(supplier); setShowForm(true); }}><Edit2 className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => setAArchivar(supplier)}><Archive className="h-4 w-4 mr-2" />Archivar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {supplier.phone && <div className="flex items-center gap-2 text-slate-500"><Phone className="h-3.5 w-3.5" /><span>{supplier.phone}</span></div>}
                {supplier.email && <div className="flex items-center gap-2 text-slate-500"><Mail className="h-3.5 w-3.5" /><span className="truncate">{supplier.email}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                <span className="text-slate-400">{etiquetaCondicion(supplier.payment_terms)}</span>
                <span className="text-slate-600 flex items-center gap-1">
                  {Number(supplier.total_orders) || 0} compra(s) · <b>{fmtMoneda(Math.round(Number(supplier.total_spent) || 0), "UYU")}</b>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12 bg-white rounded-lg"><Users className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">{suppliers.length ? "Ningún proveedor coincide" : "Todavía no hay proveedores cargados"}</p></div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editSupplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle></DialogHeader>
          {saveMutation.error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{saveMutation.error.message}</div>}
          <SupplierForm key={editSupplier?.id || "nuevo"} supplier={editSupplier} onSave={(data) => saveMutation.mutate(data)} onCancel={() => setShowForm(false)} isSaving={saveMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!aArchivar} onOpenChange={(o) => !o && setAArchivar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>¿Archivar {aArchivar?.name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Deja de aparecer en la lista y al registrar compras. Sus compras y precios anteriores se conservan en el historial.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAArchivar(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => archiveMutation.mutate(aArchivar.id)} disabled={archiveMutation.isPending}>Archivar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <FichaProveedor proveedor={ficha} onClose={() => setFicha(null)} />
    </div>
  );
}

function FichaProveedor({ proveedor, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["supplier-history", proveedor?.id],
    queryFn: () => PurchaseOrder.historialProveedor(proveedor.id),
    enabled: !!proveedor,
  });
  const [vista, setVista] = useState("productos");

  return (
    <Dialog open={!!proveedor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {proveedor && (
          <>
            <DialogHeader><DialogTitle>{proveedor.name}</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
              {proveedor.tax_id && <p>RUT {proveedor.tax_id}</p>}
              {proveedor.contact_name && <p>{proveedor.contact_name}</p>}
              {proveedor.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{proveedor.phone}</p>}
              {proveedor.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" />{proveedor.email}</p>}
              {(proveedor.address || proveedor.city) && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{[proveedor.address, proveedor.city].filter(Boolean).join(", ")}</p>}
              {proveedor.payment_terms && <p>Pago: {etiquetaCondicion(proveedor.payment_terms)}</p>}
            </div>
            {proveedor.notes && <p className="text-sm text-slate-500 bg-slate-50 rounded p-2">{proveedor.notes}</p>}

            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mt-2">
              {[["productos", "Qué se le compró"], ["compras", "Compras"]].map(([v, e]) => (
                <button key={v} onClick={() => setVista(v)} className={`px-3 py-1.5 text-sm rounded-md ${vista === v ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-500"}`}>{e}</button>
              ))}
            </div>

            {isLoading ? <p className="text-center py-8 text-slate-400 text-sm">Cargando…</p> : vista === "productos" ? (
              data?.productos?.length ? (
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-500 uppercase border-b">
                    <tr><th className="text-left py-2">Producto</th><th className="text-center py-2">Unidades</th><th className="text-right py-2">Precio unit. (sin IVA)</th><th className="text-right py-2">Última compra</th></tr>
                  </thead>
                  <tbody>
                    {data.productos.map((p) => (
                      <tr key={p.product_id} className="border-b last:border-0">
                        <td className="py-2"><p className="font-medium">{p.product_name}</p><p className="text-xs text-slate-500">{p.sku}</p></td>
                        <td className="text-center py-2">{p.unidades}</td>
                        <td className="text-right py-2">{fmtMoneda(p.ultimo_costo, p.ultima_moneda)}{p.ultima_moneda === "USD" && <p className="text-[11px] text-slate-400">{fmtMoneda(p.ultimo_costo_uyu, "UYU")}</p>}</td>
                        <td className="text-right py-2 text-slate-500">{fmtFecha(p.ultima_fecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-center py-8 text-slate-400 text-sm">Todavía no se le compró nada</p>
            ) : (
              data?.compras?.length ? (
                <div className="divide-y">
                  {data.compras.map((c) => {
                    const estado = ESTADOS_COMPRA[c.status] || { etiqueta: c.status, clase: "bg-slate-100 text-slate-600" };
                    return (
                      <Link key={c.id} to={createPageUrl("PurchaseOrderDetail") + "?id=" + c.id} onClick={onClose} className="flex items-center justify-between gap-2 py-2 hover:bg-slate-50 px-1 rounded">
                        <div>
                          <p className="text-sm font-mono font-semibold">{c.po_number} <span className={`ml-1 font-sans text-[10px] font-medium px-1.5 py-0.5 rounded ${estado.clase}`}>{estado.etiqueta}</span></p>
                          <p className="text-xs text-slate-500">{[fmtFecha(c.order_date), c.payment_method_name, c.invoice_number && `Factura ${c.invoice_number}`].filter(Boolean).join(" · ")}</p>
                        </div>
                        <p className={`text-sm font-semibold ${c.status === "cancelled" ? "line-through text-slate-400" : ""}`}>{fmtMoneda(c.total, c.currency || "UYU")}</p>
                      </Link>
                    );
                  })}
                </div>
              ) : <p className="text-center py-8 text-slate-400 text-sm">Sin compras registradas</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
