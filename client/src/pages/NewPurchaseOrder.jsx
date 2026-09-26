import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl, getDefaultExchangeRate } from "@/utils";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { Product } from "@/entities/Product";
import { Supplier } from "@/entities/Supplier";
import { PaymentMethod } from "@/entities/PaymentMethod";
import { ArrowLeft, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import POItemsEditor from "../components/POItemsEditor";
import SupplierForm from "../components/SupplierForm";
import StockVendidoDialog from "../components/StockVendidoDialog";
import { fmtMoneda, TASAS_IVA } from "../components/purchaseFormat";
import moment from "moment";

const selectClase = "w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm";

/**
 * Registrar una compra (o corregirla, con ?id=). Al guardar, el servidor suma
 * el stock, actualiza el costo de cada producto y anota el gasto, todo junto.
 */
export default function NewPurchaseOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editId = new URLSearchParams(window.location.search).get("id");

  const [form, setForm] = useState({
    supplier_id: "",
    order_date: moment().format("YYYY-MM-DD"),
    invoice_number: "",
    currency: "UYU",
    exchange_rate: String(getDefaultExchangeRate()),
    tax_rate: 0,
    payment_method_id: "",
    notes: "",
  });
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [nuevoProveedor, setNuevoProveedor] = useState(false);
  const [faltantes, setFaltantes] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers", "activos"], queryFn: () => Supplier.filter({ is_active: true }, "name", 500) });
  const { data: products = [] } = useQuery({ queryKey: ["products", "activos"], queryFn: () => Product.filter({ is_active: true }, "name", 5000) });
  const { data: metodos = [] } = useQuery({ queryKey: ["payment-methods"], queryFn: () => PaymentMethod.list("name", 50) });
  const { data: precios = [] } = useQuery({ queryKey: ["purchase-prices"], queryFn: () => PurchaseOrder.precios() });
  const { data: original } = useQuery({ queryKey: ["purchase-order", editId], queryFn: () => PurchaseOrder.detalle(editId), enabled: !!editId });

  // Al editar, se carga la compra una sola vez; después manda el formulario
  useEffect(() => {
    if (!original) return;
    setForm({
      supplier_id: original.supplier_id || "",
      order_date: original.order_date ? moment.utc(original.order_date).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      invoice_number: original.invoice_number || "",
      currency: original.currency || "UYU",
      exchange_rate: String(Number(original.exchange_rate) > 1 ? original.exchange_rate : getDefaultExchangeRate()),
      tax_rate: Number(original.tax_rate) || 0,
      payment_method_id: original.payment_method_id || "",
      notes: original.notes || "",
    });
    const lineas = original.items?.length
      ? original.items
      : (() => { try { return JSON.parse(original.items_json || "[]"); } catch { return []; } })();
    setItems(lineas.filter((l) => l.product_id).map((l) => ({
      product_id: String(l.product_id), product_name: l.product_name, sku: l.sku,
      quantity: Number(l.quantity) || 1, unit_cost: Number(l.unit_cost) || 0,
    })));
  }, [original]);

  const tc = form.currency === "USD" ? (parseFloat(form.exchange_rate) || 0) : 1;
  const subtotal = items.reduce((s, i) => s + (Number(i.unit_cost) || 0) * i.quantity, 0);
  const iva = subtotal * (Number(form.tax_rate) || 0) / 100;
  const total = subtotal + iva;

  const crearProveedor = useMutation({
    mutationFn: (datos) => Supplier.create({ ...datos, is_active: true }),
    onSuccess: (creado) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      set("supplier_id", String(creado.id));
      setNuevoProveedor(false);
    },
  });

  const guardar = useMutation({
    mutationFn: (datos) => (editId ? PurchaseOrder.editar(editId, datos) : PurchaseOrder.registrar(datos)),
    onSuccess: (orden) => {
      for (const k of ["purchase-orders", "purchase-order", "purchase-prices", "products", "stock-movements", "expenses", "suppliers", "supplier-history"]) {
        queryClient.invalidateQueries({ queryKey: [k] });
      }
      navigate(createPageUrl("PurchaseOrderDetail") + "?id=" + (orden?.id || editId), { replace: true });
    },
    onError: (e) => {
      if (e.data?.codigo === "stock_insuficiente") return setFaltantes(e.data.faltantes);
      setError(e.message);
    },
  });

  const enviar = (confirmarStock = false) => {
    setFaltantes(null);
    setError("");
    if (!form.supplier_id) return setError("Elegí el proveedor");
    if (!items.length) return setError("Agregá al menos un producto");
    if (items.some((i) => i.unit_cost === "" || Number(i.unit_cost) < 0)) return setError("Revisá los costos: hay alguno vacío");
    if (form.currency === "USD" && !(tc > 0)) return setError("Poné el tipo de cambio");
    guardar.mutate({
      ...form,
      exchange_rate: tc,
      tax_rate: Number(form.tax_rate) || 0,
      items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: Number(i.unit_cost) || 0 })),
      confirmar_stock: confirmarStock,
    });
  };

  const bloqueada = original && (original.status === "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{editId ? `Editar compra ${original?.po_number || ""}` : "Nueva compra"}</h1>
          <p className="text-sm text-slate-500">Al registrarla, el stock se suma y se anota como gasto de compras</p>
        </div>
      </div>

      {editId && original?.status === "received" && (
        <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          Al guardar se corrige todo junto: el stock queda como si la compra se hubiera cargado bien desde el principio, y el gasto se actualiza.
        </div>
      )}
      {bloqueada && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">Esta compra está anulada y no se puede editar.</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Datos de la compra</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Proveedor *</Label>
                <div className="flex gap-2">
                  <select value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)} className={selectClase}>
                    <option value="">Elegir proveedor…</option>
                    {suppliers.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="icon" title="Nuevo proveedor" onClick={() => setNuevoProveedor(true)}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.order_date} max={moment().format("YYYY-MM-DD")} onChange={(e) => set("order_date", e.target.value)} />
              </div>
              <div>
                <Label>N° de factura (opcional)</Label>
                <Input value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} />
              </div>
              <div>
                <Label>Moneda</Label>
                <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={selectClase}>
                  <option value="UYU">$ Pesos (UYU)</option>
                  <option value="USD">US$ Dólares (USD)</option>
                </select>
              </div>
              {form.currency === "USD" ? (
                <div>
                  <Label>Tipo de cambio</Label>
                  <Input type="number" min="0" step="0.01" value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)} />
                </div>
              ) : <div className="hidden sm:block" />}
              <div>
                <Label>IVA</Label>
                <select value={form.tax_rate} onChange={(e) => set("tax_rate", Number(e.target.value))} className={selectClase}>
                  {TASAS_IVA.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Cargá los costos sin IVA; se suma al total</p>
              </div>
              <div>
                <Label>¿Cómo se pagó?</Label>
                <select value={form.payment_method_id} onChange={(e) => set("payment_method_id", e.target.value)} className={selectClase}>
                  <option value="">Sin especificar</option>
                  {metodos.filter((m) => m.is_active !== false || String(m.id) === form.payment_method_id).map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          <POItemsEditor
            products={products} items={items} onItemsChange={setItems}
            currency={form.currency} exchangeRate={tc} supplierId={form.supplier_id} precios={precios}
          />

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Notas</CardTitle></CardHeader>
            <CardContent><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-0 shadow-sm lg:sticky lg:top-4">
            <CardHeader><CardTitle className="text-sm">Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Productos</span><span>{items.length} ({items.reduce((s, i) => s + i.quantity, 0)} u.)</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{fmtMoneda(subtotal, form.currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">IVA {form.tax_rate}%</span><span>{fmtMoneda(iva, form.currency)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-3"><span>Total</span><span className="text-[#E8461E]">{fmtMoneda(total, form.currency)}</span></div>
              {form.currency === "USD" && <p className="text-xs text-slate-500 text-right">= {fmtMoneda(total * tc, "UYU")} en pesos</p>}
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <Button className="w-full bg-[#E8461E] hover:bg-[#c73a15]" onClick={() => enviar(false)} disabled={guardar.isPending || bloqueada}>
                {guardar.isPending ? "Guardando…" : editId ? "Guardar cambios" : "Registrar compra"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <StockVendidoDialog
        faltantes={faltantes} accion="guardar la corrección"
        onConfirmar={() => enviar(true)} onCancelar={() => setFaltantes(null)} procesando={guardar.isPending}
      />

      <Dialog open={nuevoProveedor} onOpenChange={setNuevoProveedor}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nuevo proveedor</DialogTitle></DialogHeader>
          {crearProveedor.error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{crearProveedor.error.message}</div>}
          <SupplierForm onSave={(d) => crearProveedor.mutate(d)} onCancel={() => setNuevoProveedor(false)} isSaving={crearProveedor.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
