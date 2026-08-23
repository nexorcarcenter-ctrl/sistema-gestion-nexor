import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-UY")}`;

/**
 * Aviso cuando se está por cobrar una orden que tiene servicios sin precio.
 *
 * No bloquea: hay casos legítimos de precio en cero (garantía, cortesía,
 * presupuesto a definir). Por eso "Cobrar igual" siempre está disponible.
 *
 * Si falta un solo precio se prellena con lo que se está cobrando, que es
 * la conjetura correcta casi siempre. Con varios se dejan vacíos, porque
 * repartir ese monto es una decisión del operador, no del sistema.
 */
export default function MissingPriceDialog({ open, onClose, servicios, montoCobrando, totalOrden, onConfirmar, onSeguir }) {
  const [precios, setPrecios] = useState({});

  useEffect(() => {
    if (!open) return;
    const inicial = {};
    servicios.forEach((s, i) => {
      inicial[i] = servicios.length === 1 ? String(Math.round(montoCobrando)) : "";
    });
    setPrecios(inicial);
  }, [open, servicios.length, montoCobrando]);

  if (!open) return null;

  const asignado = Object.values(precios).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const nuevoTotal = totalOrden + asignado;
  const restante = montoCobrando - nuevoTotal;
  const hayAlgo = asignado > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Falta el precio de un servicio
          </DialogTitle>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">
          La orden dice <b>{fmt(totalOrden)}</b> y vas a cobrar <b>{fmt(montoCobrando)}</b>.
          {servicios.length === 1
            ? " Podés cargarle el precio ahora para que la venta quede con su detalle."
            : " Cargá cuánto corresponde a cada servicio."}
        </div>

        <div className="space-y-3">
          {servicios.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-slate-700 truncate">{s.service_name || "Servicio sin nombre"}</span>
              <div className="relative w-32 shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  type="number" min="0" inputMode="numeric"
                  className="pl-6 text-right"
                  value={precios[i] ?? ""}
                  onChange={(e) => setPrecios((p) => ({ ...p, [i]: e.target.value }))}
                  placeholder="0"
                  autoFocus={i === 0}
                />
              </div>
            </div>
          ))}
        </div>

        {hayAlgo && (
          <div className="text-xs rounded-lg bg-slate-50 p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">La orden quedaría en</span>
              <span className="font-bold text-slate-800">{fmt(nuevoTotal)}</span>
            </div>
            {Math.abs(restante) >= 1 && (
              <div className={`flex justify-between ${restante > 0 ? "text-amber-700" : "text-blue-700"}`}>
                <span>{restante > 0 ? "Queda sin asignar" : "Supera lo que estás cobrando por"}</span>
                <span className="font-semibold">{fmt(Math.abs(restante))}</span>
              </div>
            )}
          </div>
        )}

        {/* La diferencia se avisa, no se impide: puede haber seña, descuento o redondeo. */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onSeguir}>
            Cobrar igual
          </Button>
          <Button
            className="flex-1 bg-[#E8461E] hover:bg-[#c73a15]"
            disabled={!hayAlgo}
            onClick={() => onConfirmar(servicios.map((_, i) => parseFloat(precios[i]) || 0))}
          >
            Actualizar orden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
