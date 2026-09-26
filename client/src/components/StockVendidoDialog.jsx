import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Aviso de que parte de una compra ya se vendió. Pasa al anular la compra o
 * al corregirla bajando cantidades: el stock no alcanza para descontar todo
 * y quedaría en 0 sin que nadie lo note. Se muestra qué falta y se decide.
 */
export default function StockVendidoDialog({ faltantes, accion, onConfirmar, onCancelar, procesando }) {
  return (
    <Dialog open={!!faltantes?.length} onOpenChange={(o) => !o && onCancelar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Parte de esta compra ya se vendió</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Para {accion} hay que descontar del stock unidades que ya no están, porque se vendieron:
        </p>
        <ul className="text-sm divide-y border rounded-lg">
          {faltantes?.map((f) => (
            <li key={f.product_id} className="flex justify-between gap-2 px-3 py-2">
              <span className="font-medium truncate">{f.product_name}</span>
              <span className="text-slate-500 shrink-0">stock {f.stock} · faltan <b className="text-red-600">{f.faltan}</b></span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          Si seguís, esos productos quedan en stock 0 y el movimiento registra lo que realmente se descontó.
          Si la mercadería se devolvió al proveedor, conviene revisar después el stock en Productos.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancelar}>Volver</Button>
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={onConfirmar} disabled={procesando}>
            {procesando ? "Procesando…" : `Sí, ${accion} igual`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
