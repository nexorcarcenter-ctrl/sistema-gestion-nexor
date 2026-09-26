import { useQuery } from "@tanstack/react-query";
import { Cotizacion } from "@/entities/Cotizacion";
import { AlertTriangle } from "lucide-react";
import moment from "moment";

// La consulta se comparte entre pantallas y se refresca sola cada una hora
export function useCotizacion() {
  return useQuery({ queryKey: ["cotizacion"], queryFn: Cotizacion.ultima, staleTime: 60 * 60 * 1000 });
}

/**
 * Línea bajo el tipo de cambio: de dónde sale la cotización propuesta y un
 * botón para volver a ella si se escribió otro valor a mano.
 */
export default function CotizacionDelDia({ valorActual, onUsar }) {
  const { data: c } = useCotizacion();
  if (!c) return <p className="text-[11px] text-slate-400 mt-1">Sin cotización automática: cargá el tipo de cambio a mano</p>;
  const distinta = Number(valorActual) !== c.venta;
  return (
    <p className={`text-[11px] mt-1 flex items-center gap-1 flex-wrap ${c.desactualizada ? "text-amber-600" : "text-slate-400"}`}>
      {c.desactualizada && <AlertTriangle className="h-3 w-3" />}
      Dólar venta ${c.venta.toLocaleString("es-UY")} · {c.fuente} · {moment(c.actualizada_fuente || c.consultada).format("DD/MM HH:mm")}
      {c.desactualizada && " (no se pudo actualizar)"}
      {distinta && onUsar && (
        <button type="button" onClick={() => onUsar(c.venta)} className="text-[#E8461E] hover:underline ml-1">usar esta</button>
      )}
    </p>
  );
}
