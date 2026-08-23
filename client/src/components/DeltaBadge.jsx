import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Variación porcentual contra el período anterior.
// Si antes no hubo movimiento no se muestra nada: un "+100%" contra cero no informa.
export default function DeltaBadge({ actual, anterior, invertir = false }) {
  if (!anterior || anterior === 0) return null;

  const pct = ((actual - anterior) / Math.abs(anterior)) * 100;
  if (!isFinite(pct)) return null;

  const sube = pct >= 0;
  const bueno = invertir ? !sube : sube;
  const Icono = Math.abs(pct) < 0.5 ? Minus : sube ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${bueno ? "text-emerald-600" : "text-red-500"}`}>
      <Icono className="h-3 w-3" />
      {sube ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}
