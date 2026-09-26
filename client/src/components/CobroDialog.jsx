import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Credito } from "@/entities/Customer";
import { PaymentMethod } from "@/entities/PaymentMethod";
import { useCashRegister } from "../context/CashRegisterContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CotizacionDelDia, { useCotizacion } from "./CotizacionDelDia";
import { fmtPesos } from "./creditFormat";
import moment from "moment";

const selectClase = "w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm";

/**
 * Cobrar una venta a crédito. En efectivo entra en la caja abierta (y sin
 * caja no se puede); con transferencia o tarjeta no hace falta caja.
 */
export default function CobroDialog({ venta, onClose, onCobrado }) {
  const { openRegister } = useCashRegister();
  const { data: metodos = [] } = useQuery({ queryKey: ["payment-methods", "activos"], queryFn: () => PaymentMethod.filter({ is_active: true }, "sort_order", 50) });
  const { data: cotizacion } = useCotizacion();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const saldo = venta ? Math.round((Number(venta.total) - Number(venta.paid_amount || 0)) * 100) / 100 : 0;

  useEffect(() => {
    if (!venta) return;
    setError("");
    setForm({ method_id: "", amount: String(saldo), exchange_rate: String(cotizacion?.venta || ""), payment_date: moment().format("YYYY-MM-DD"), notes: "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venta?.id]);

  const cobrar = useMutation({
    mutationFn: (datos) => Credito.cobrar(venta.id, datos),
    onSuccess: (v) => { onCobrado?.(v); onClose(); },
    onError: (e) => setError(e.message),
  });

  if (!venta || !form) return null;
  const metodo = metodos.find((m) => String(m.id) === form.method_id);
  const enDolares = metodo?.currency === "USD";
  const tc = enDolares ? (parseFloat(form.exchange_rate) || 0) : 1;
  const monto = parseFloat(form.amount) || 0;
  const enPesos = Math.round(monto * tc * 100) / 100;
  const esEfectivo = metodo?.type === "cash";

  // Al pasar a una forma de pago en dólares, el monto propuesto se convierte
  const elegirMetodo = (id) => {
    const m = metodos.find((x) => String(x.id) === id);
    const aDolares = m?.currency === "USD";
    const tcActual = parseFloat(form.exchange_rate) || cotizacion?.venta || 0;
    setForm((f) => ({
      ...f,
      method_id: id,
      amount: aDolares && tcActual ? String(Math.round((saldo / tcActual) * 100) / 100) : String(saldo),
      exchange_rate: f.exchange_rate || String(cotizacion?.venta || ""),
    }));
  };

  const enviar = () => {
    setError("");
    if (!metodo) return setError("Elegí la forma de pago");
    if (!(monto > 0)) return setError("Poné un monto mayor a cero");
    if (enDolares && !(tc > 0)) return setError("Poné el tipo de cambio");
    if (enPesos > saldo + 0.009) return setError(`No puede superar lo que se debe (${fmtPesos(saldo)})`);
    if (esEfectivo && !openRegister) return setError("Para cobrar en efectivo tiene que haber una caja abierta hoy");
    cobrar.mutate({ ...form, amount: monto, exchange_rate: tc, cash_register_id: esEfectivo ? openRegister?.id : null });
  };

  return (
    <Dialog open={!!venta} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Cobrar {venta.sale_number} · {venta.customer_name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 rounded-lg p-3">
          <div><p className="text-slate-500">Total</p><p className="font-semibold text-sm">{fmtPesos(venta.total)}</p></div>
          <div><p className="text-slate-500">Cobrado</p><p className="font-semibold text-sm">{fmtPesos(venta.paid_amount)}</p></div>
          <div><p className="text-slate-500">Debe</p><p className="font-semibold text-sm text-red-600">{fmtPesos(saldo)}</p></div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Forma de pago</Label>
            <select value={form.method_id} onChange={(e) => elegirMetodo(e.target.value)} className={selectClase}>
              <option value="">Elegir…</option>
              {metodos.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
            </select>
            {metodo && (
              <p className={`text-[11px] mt-1 ${esEfectivo && !openRegister ? "text-red-600" : "text-slate-400"}`}>
                {esEfectivo ? (openRegister ? "Entra en la caja abierta de hoy" : "Efectivo: hace falta abrir la caja") : "No pasa por la caja del mostrador"}
              </p>
            )}
          </div>
          <div>
            <Label>Monto ({enDolares ? "US$" : "$"})</Label>
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.payment_date} max={moment().format("YYYY-MM-DD")} onChange={(e) => set("payment_date", e.target.value)} />
          </div>
          {enDolares && (
            <div className="col-span-2">
              <Label>Tipo de cambio</Label>
              <Input type="number" min="0" step="0.01" value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)} />
              <CotizacionDelDia valorActual={form.exchange_rate} onUsar={(v) => set("exchange_rate", String(v))} />
              {tc > 0 && <p className="text-xs text-slate-600 mt-1">= {fmtPesos(enPesos)} de la deuda</p>}
            </div>
          )}
          <div className="col-span-2">
            <Label>Nota (opcional)</Label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="N° de transferencia, recibo…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={enviar} disabled={cobrar.isPending}>
            {cobrar.isPending ? "Registrando…" : `Cobrar ${enDolares ? `US$ ${monto}` : fmtPesos(monto)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
