import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { ArrowLeft, Edit2, Ban, Trash2, Receipt, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtMoneda, fmtFecha, ESTADOS_COMPRA, estadoPago } from "../components/purchaseFormat";
import PagoCompraDialog from "../components/PagoCompraDialog";
import StockVendidoDialog from "../components/StockVendidoDialog";

function Fila({ etiqueta, children }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">{etiqueta}</span><span className="text-right">{children}</span></div>;
}

export default function PurchaseOrderDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const orderId = new URLSearchParams(window.location.search).get("id");
  const [confirmarAnular, setConfirmarAnular] = useState(false);
  const [error, setError] = useState("");
  const [faltantes, setFaltantes] = useState(null);
  const [pagando, setPagando] = useState(false);

  const { data: order, isLoading } = useQuery({ queryKey: ["purchase-order", orderId], queryFn: () => PurchaseOrder.detalle(orderId), enabled: !!orderId });

  const refrescar = () => {
    for (const k of ["purchase-orders", "purchase-order", "purchase-prices", "purchase-debts", "products", "stock-movements", "expenses", "suppliers", "supplier-history"]) {
      queryClient.invalidateQueries({ queryKey: [k] });
    }
  };
  const anular = useMutation({
    mutationFn: (confirmarStock = false) => PurchaseOrder.anular(orderId, { confirmarStock }),
    onSuccess: () => { setConfirmarAnular(false); setFaltantes(null); refrescar(); },
    onError: (e) => {
      setConfirmarAnular(false);
      if (e.data?.codigo === "stock_insuficiente") return setFaltantes(e.data.faltantes);
      setFaltantes(null);
      setError(e.message);
    },
  });
  const borrarPago = useMutation({
    mutationFn: (pagoId) => PurchaseOrder.borrarPago(orderId, pagoId),
    onSuccess: refrescar,
    onError: (e) => setError(e.message),
  });
  const borrar = useMutation({
    mutationFn: () => PurchaseOrder.borrarPedido(orderId),
    onSuccess: () => { refrescar(); navigate(createPageUrl("PurchaseOrders"), { replace: true }); },
    onError: (e) => setError(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;
  if (!order) return <div className="text-center py-12"><p className="text-slate-500">No se encontró la compra</p></div>;

  const estado = ESTADOS_COMPRA[order.status] || { etiqueta: order.status, clase: "bg-slate-100 text-slate-600" };
  const moneda = order.currency || "UYU";
  const lineas = order.items?.length
    ? order.items
    : (() => { try { return JSON.parse(order.items_json || "[]"); } catch { return []; } })();
  const registrada = order.status === "received";
  const esPedidoViejo = ["draft", "sent", "confirmed"].includes(order.status);
  // Recibida por el sistema anterior: sumó stock sin dejar líneas, no se puede deshacer
  const esVieja = registrada && !order.items?.length;
  const esCredito = order.payment_type === "credito";
  const pagos = order.pagos || [];
  const saldo = Math.round((Number(order.total) - Number(order.paid_amount || 0)) * 100) / 100;
  const pago = estadoPago(order);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{order.po_number}</h1>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${estado.clase}`}>{estado.etiqueta}</span>
          </div>
          <p className="text-sm text-slate-500">{order.supplier_name} · {fmtFecha(order.order_date)}</p>
        </div>
        {(registrada && !esVieja) && (
          <>
            <Link to={createPageUrl("NewPurchaseOrder") + "?id=" + order.id}>
              <Button variant="outline"><Edit2 className="h-4 w-4 mr-2" />Editar</Button>
            </Link>
            <Button variant="outline" className="text-red-600" onClick={() => setConfirmarAnular(true)}><Ban className="h-4 w-4 mr-2" />Anular</Button>
          </>
        )}
        {esPedidoViejo && (
          <>
            <Link to={createPageUrl("NewPurchaseOrder") + "?id=" + order.id}>
              <Button className="bg-[#E8461E] hover:bg-[#c73a15]">Registrar como recibida</Button>
            </Link>
            <Button variant="outline" className="text-red-600" onClick={() => borrar.mutate()} disabled={borrar.isPending}><Trash2 className="h-4 w-4 mr-2" />Borrar pedido</Button>
          </>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {order.status === "cancelled" && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">Compra anulada: se descontó el stock que había sumado y se borró su gasto.</div>}
      {esPedidoViejo && <div className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-lg text-sm">Este pedido quedó del sistema anterior y nunca se recibió: todavía no sumó stock ni generó gasto.</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Productos</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-xs text-slate-500 uppercase border-b">
                <tr>
                  <th className="text-left py-2">Producto</th>
                  <th className="text-center py-2">Cant.</th>
                  <th className="text-right py-2">Costo unit.</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={l.id || i} className="border-b last:border-0">
                    <td className="py-2"><p className="font-medium">{l.product_name}</p><p className="text-xs text-slate-500">{l.sku}</p></td>
                    <td className="text-center py-2">{l.quantity}</td>
                    <td className="text-right py-2">
                      {fmtMoneda(l.unit_cost, moneda)}
                      {moneda === "USD" && l.unit_cost_uyu != null && <p className="text-[11px] text-slate-400">{fmtMoneda(l.unit_cost_uyu, "UYU")}</p>}
                    </td>
                    <td className="text-right py-2 font-medium">{fmtMoneda(l.total, moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Detalle</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Fila etiqueta="Proveedor">{order.supplier_name}</Fila>
              <Fila etiqueta="Fecha">{fmtFecha(order.order_date)}</Fila>
              {order.invoice_number && <Fila etiqueta="Factura">{order.invoice_number}</Fila>}
              <Fila etiqueta="Moneda">{moneda === "USD" ? `Dólares (TC ${Number(order.exchange_rate)})` : "Pesos"}</Fila>
              {!esCredito && <Fila etiqueta="Forma de pago">{order.payment_method_name || "Sin especificar"}</Fila>}
              {order.created_by_name && <Fila etiqueta="Cargó">{order.created_by_name}</Fila>}
              {order.notes && <p className="text-sm text-slate-600 pt-2 border-t">{order.notes}</p>}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Totales</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Fila etiqueta="Subtotal">{fmtMoneda(order.subtotal, moneda)}</Fila>
              <Fila etiqueta={`IVA ${Number(order.tax_rate) || 0}%`}>{fmtMoneda(order.tax_amount, moneda)}</Fila>
              <div className="flex justify-between text-lg font-bold border-t pt-3"><span>Total</span><span className="text-[#E8461E]">{fmtMoneda(order.total, moneda)}</span></div>
              {moneda === "USD" && <p className="text-xs text-slate-500 text-right">= {fmtMoneda(order.total_uyu, "UYU")}</p>}
            </CardContent>
          </Card>
          {registrada && !esVieja && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Pago</CardTitle>
                {pago && <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${pago.clase}`}>{pago.etiqueta}</span>}
              </CardHeader>
              <CardContent className="space-y-2">
                <Fila etiqueta="Condición">{esCredito ? `Crédito a ${order.credit_days} días` : "Contado"}</Fila>
                {esCredito && order.due_date && <Fila etiqueta="Vence">{fmtFecha(order.due_date)}</Fila>}
                {pagos.length > 0 && (
                  <div className="border-t pt-2 space-y-1.5">
                    {pagos.map((p) => (
                      <div key={p.id} className="flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="text-slate-700">{fmtFecha(p.payment_date)}{p.payment_method_name ? ` · ${p.payment_method_name}` : ""}</p>
                          {p.notes && <p className="text-[11px] text-slate-400 truncate">{p.notes}</p>}
                        </div>
                        <div className="text-right shrink-0 flex items-start gap-1">
                          <div>
                            <p className="font-medium">{fmtMoneda(p.amount, moneda)}</p>
                            {moneda === "USD" && <p className="text-[11px] text-slate-400">{fmtMoneda(p.amount_uyu, "UYU")} (TC {Number(p.exchange_rate)})</p>}
                          </div>
                          {esCredito && (
                            <button onClick={() => borrarPago.mutate(p.id)} disabled={borrarPago.isPending} title="Borrar este pago" className="p-0.5 text-slate-300 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {esCredito && (
                  <div className="border-t pt-2 space-y-1">
                    <Fila etiqueta="Pagado">{fmtMoneda(order.paid_amount, moneda)}</Fila>
                    <div className="flex justify-between text-sm font-semibold"><span>Debe</span><span className={saldo > 0 ? "text-red-600" : "text-emerald-700"}>{fmtMoneda(saldo, moneda)}</span></div>
                  </div>
                )}
                {esCredito && saldo > 0.009 && (
                  <Button className="w-full bg-[#E8461E] hover:bg-[#c73a15] mt-2" onClick={() => setPagando(true)}><Wallet className="h-4 w-4 mr-2" />Registrar pago</Button>
                )}
                {pagos.length > 0 && (
                  <p className="text-xs text-violet-700 flex items-center gap-1 pt-1"><Receipt className="h-3.5 w-3.5" />Cada pago figura en Gastos como compra de mercadería</p>
                )}
                {esCredito && pagos.length === 0 && <p className="text-xs text-slate-500">Todavía no se pagó nada: no cuenta como gasto hasta que se pague.</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <PagoCompraDialog compra={pagando ? order : null} onClose={() => setPagando(false)} onPagado={refrescar} />

      <StockVendidoDialog
        faltantes={faltantes} accion="anular"
        onConfirmar={() => anular.mutate(true)} onCancelar={() => setFaltantes(null)} procesando={anular.isPending}
      />

      <Dialog open={confirmarAnular} onOpenChange={setConfirmarAnular}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>¿Anular {order.po_number}?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Se va a descontar del stock lo que sumó esta compra, se repone el costo anterior de los productos y se borra su gasto. La compra queda en el listado como anulada.</p>
          {esCredito && pagos.length > 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">Esta compra tiene {pagos.length} pago(s) registrado(s): también se borran, con sus gastos. Si esa plata realmente se pagó, cargala después como gasto.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmarAnular(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => anular.mutate(false)} disabled={anular.isPending}>{anular.isPending ? "Anulando…" : "Anular compra"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
