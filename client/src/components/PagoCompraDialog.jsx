import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { PaymentMethod } from "@/entities/PaymentMethod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CotizacionDelDia, { useCotizacion } from "./CotizacionDelDia";
import { fmtMoneda, fmtFecha } from "./purchaseFormat";
import moment from "moment";

const selectClase = "w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm";

/**
 * Registrar un pago de una compra a crédito. El pago es en la moneda de la
 * compra; si es en dólares, se pasa a pesos con la cotización del día del
 * pago, que es cuando cuenta como gasto.
 */
export default function PagoCompraDialog({ compra, onClose, onPagado }) {
  const { data: metodos = [] } = useQuery({ queryKey: ["payment-methods"], queryFn: () => PaymentMethod.list("name", 50) });
  const { data: cotizacion } = useCotizacion();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const moneda = compra?.currency || "UYU";
  const saldo = compra ? Math.round((Number(compra.total) - Number(compra.paid_amount || 0)) * 100) / 100 : 0;

  useEffect(() => {
    if (!compra) return;
    setError("");
    setForm({
      amount: String(saldo),
      payment_date: moment().format("YYYY-MM-DD"),
      exchange_rate: String(cotizacion?.venta || compra.exchange_rate || ""),
      payment_method_id: "",
      notes: "",
    });
  // La cotización puede llegar después de abrir: solo se usa para el valor inicial
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compra?.id]);

  const pagar = useMutation({
    mutationFn: (datos) => PurchaseOrder.pagar(compra.id, datos),
    onSuccess: (orden) => { onPagado?.(orden); onClose(); },
    onError: (e) => setError(e.message),
  });

  if (!compra || !form) return null;
  const monto = parseFloat(form.amount) || 0;
  const tc = moneda === "USD" ? (parseFloat(form.exchange_rate) || 0) : 1;

  const enviar = () => {
    setError("");
    if (!(monto > 0)) return setError("Poné un monto mayor a cero");
    if (monto > saldo + 0.009) return setError(`No puede superar lo que se debe (${fmtMoneda(saldo, moneda)})`);
    if (moneda === "USD" && !(tc > 0)) return setError("Poné el tipo de cambio");
    pagar.mutate({ ...form, amount: monto, exchange_rate: tc });
  };

  return (
    <Dialog open={!!compra} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Pagar {compra.po_number} · {compra.supplier_name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 rounded-lg p-3">
          <div><p className="text-slate-500">Total</p><p className="font-semibold text-sm">{fmtMoneda(compra.total, moneda)}</p></div>
          <div><p className="text-slate-500">Pagado</p><p className="font-semibold text-sm">{fmtMoneda(compra.paid_amount, moneda)}</p></div>
          <div><p className="text-slate-500">Debe</p><p className="font-semibold text-sm text-red-600">{fmtMoneda(saldo, moneda)}</p></div>
        </div>
        {compra.due_date && <p className="text-xs text-slate-500">Vence el {fmtFecha(compra.due_date)}</p>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Monto ({moneda === "USD" ? "US$" : "$"})</Label>
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Fecha del pago</Label>
            <Input type="date" value={form.payment_date} max={moment().format("YYYY-MM-DD")} onChange={(e) => set("payment_date", e.target.value)} />
          </div>
          {moneda === "USD" && (
            <div className="col-span-2">
              <Label>Tipo de cambio del día del pago</Label>
              <Input type="number" min="0" step="0.01" value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)} />
              <CotizacionDelDia valorActual={form.exchange_rate} onUsar={(v) => set("exchange_rate", String(v))} />
              {tc > 0 && <p className="text-xs text-slate-600 mt-1">= {fmtMoneda(Math.round(monto * tc * 100) / 100, "UYU")} de gasto en pesos</p>}
            </div>
          )}
          <div className="col-span-2">
            <Label>¿Cómo se pagó?</Label>
            <select value={form.payment_method_id} onChange={(e) => set("payment_method_id", e.target.value)} className={selectClase}>
              <option value="">Sin especificar</option>
              {metodos.filter((m) => m.is_active !== false).map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <Label>Nota (opcional)</Label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="N° de transferencia, cheque…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={enviar} disabled={pagar.isPending}>
            {pagar.isPending ? "Registrando…" : `Registrar pago de ${fmtMoneda(monto, moneda)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
