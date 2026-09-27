import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PaymentMethod } from "@/entities/PaymentMethod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CotizacionDelDia, { useCotizacion } from "./CotizacionDelDia";
import { Banknote, CreditCard, ArrowLeftRight, FileCheck, MoreHorizontal, AlertCircle } from "lucide-react";

const ICONOS = { cash: Banknote, card: CreditCard, transfer: ArrowLeftRight, check: FileCheck, other: MoreHorizontal };
const pesos = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString("es-UY")}`;

/**
 * Cobro del Punto de Venta. Se puede pagar con varias formas a la vez y en
 * pesos o dólares; lo que se entrega de más vuelve en efectivo, en pesos.
 */
export default function PosCobroDialog({ abierto, total, procesando, error, onClose, onConfirmar }) {
  const { data: metodos = [] } = useQuery({ queryKey: ["payment-methods", "activos"], queryFn: () => PaymentMethod.filter({ is_active: true }, "sort_order", 50) });
  const { data: cotizacion } = useCotizacion();
  const [montos, setMontos] = useState({});
  const [tc, setTc] = useState("");

  useEffect(() => {
    if (!abierto) return;
    setMontos({});
    setTc(String(cotizacion?.venta || ""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const tipoCambio = parseFloat(tc) || 0;
  const cobrado = metodos.reduce((s, m) => {
    const monto = parseFloat(montos[m.id]) || 0;
    return s + (m.currency === "USD" ? monto * tipoCambio : monto);
  }, 0);
  const falta = Math.max(total - cobrado, 0);
  const vuelto = Math.max(cobrado - total, 0);
  const hayDolares = metodos.some((m) => m.currency === "USD" && parseFloat(montos[m.id]) > 0);
  const listo = cobrado >= total - 0.009 && (!hayDolares || tipoCambio > 0);

  // "Exacto": completa lo que falta en la primera forma de pago en pesos elegida (o en efectivo)
  const exacto = (m) => {
    const otros = cobrado - (m.currency === "USD" ? (parseFloat(montos[m.id]) || 0) * tipoCambio : (parseFloat(montos[m.id]) || 0));
    const resto = Math.max(total - otros, 0);
    const valor = m.currency === "USD" ? (tipoCambio ? Math.ceil((resto / tipoCambio) * 100) / 100 : 0) : Math.round(resto * 100) / 100;
    setMontos((x) => ({ ...x, [m.id]: String(valor) }));
  };

  const confirmar = () => onConfirmar(
    metodos
      .filter((m) => parseFloat(montos[m.id]) > 0)
      .map((m) => ({ method_id: m.id, amount: parseFloat(montos[m.id]), exchange_rate: m.currency === "USD" ? tipoCambio : 1 }))
  );

  const grupo = (moneda, titulo) => {
    const lista = metodos.filter((m) => (m.currency === "USD" ? "USD" : "UYU") === moneda);
    if (!lista.length) return null;
    return (
      <div>
        <p className="text-xs text-slate-500 mb-1.5">{titulo}</p>
        <div className="space-y-2">
          {lista.map((m) => {
            const Icono = ICONOS[m.type] || Banknote;
            return (
              <div key={m.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 w-36 shrink-0 min-w-0">
                  <Icono className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 truncate">{m.name}</span>
                </div>
                <Input
                  type="number" min="0" step="0.01" inputMode="decimal" placeholder="0" className="h-9"
                  value={montos[m.id] || ""} onChange={(e) => setMontos((x) => ({ ...x, [m.id]: e.target.value }))}
                />
                <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={() => exacto(m)}>Exacto</Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !procesando && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cobrar {pesos(total)}</DialogTitle></DialogHeader>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div className="space-y-4">
          {grupo("UYU", "Pesos")}
          {metodos.some((m) => m.currency === "USD") && (
            <div className="space-y-2">
              {grupo("USD", "Dólares")}
              <div>
                <Label className="text-xs">Tipo de cambio</Label>
                <Input type="number" min="0" step="0.01" className="h-9" value={tc} onChange={(e) => setTc(e.target.value)} />
                <CotizacionDelDia valorActual={tc} onUsar={(v) => setTc(String(v))} />
              </div>
            </div>
          )}
        </div>
        <div className="border-t pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold">{pesos(total)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Recibido</span><span className="font-bold text-[#c73a15]">{pesos(cobrado)}</span></div>
          {vuelto > 0.009 && <div className="flex justify-between text-base"><span className="text-slate-600">Vuelto (en pesos)</span><span className="font-bold text-amber-600">{pesos(vuelto)}</span></div>}
          {falta > 0.009 && cobrado > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5"><AlertCircle className="h-3.5 w-3.5" />Falta cobrar {pesos(falta)}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={procesando}>Cancelar</Button>
          <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={confirmar} disabled={!listo || procesando}>
            {procesando ? "Registrando…" : "Confirmar venta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
