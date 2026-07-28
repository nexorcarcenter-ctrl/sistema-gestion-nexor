import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CarInspectionCanvas from "@/components/CarInspectionCanvas";
import {
  ArrowLeft, Car, User, Phone, Clock, CalendarDays,
  CheckCircle, LogOut, TrendingUp, TrendingDown, Minus
} from "lucide-react";

export default function ExitInspectionPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [exitMileage, setExitMileage] = useState("");
  const [exitObservations, setExitObservations] = useState("");
  const [exitInspectionData, setExitInspectionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) { navigate(createPageUrl("ServiceOrders")); return; }
    ServiceOrder.get(orderId).then(o => {
      setOrder(o);
      setExitMileage(o?.car_mileage_exit ? String(o.car_mileage_exit) : "");
      setExitObservations(o?.exit_observations || "");
      if (o?.exit_inspection_data) {
        setExitInspectionData(JSON.parse(o.exit_inspection_data));
      }
      setLoading(false);
    }).catch(() => setError("Error al cargar datos"));
  }, [orderId]);

  const handleConfirm = async () => {
    setSaving(true);
    await ServiceOrder.update(orderId, {
      car_mileage_exit: exitMileage ? parseFloat(exitMileage) : 0,
      exit_inspection_data: exitInspectionData ? JSON.stringify(exitInspectionData) : null,
      exit_inspection_status: "exited",
      exit_observations: exitObservations,
      status: "delivered",
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate(createPageUrl(`ServiceOrderDetail?id=${orderId}`)), 1200);
  };

  if (loading) return <div className="text-center py-16 text-slate-400">Cargando...</div>;
  if (!order) return <div className="text-center py-16 text-slate-400">Orden no encontrada</div>;

  const entryKm = order.car_mileage ? Number(order.car_mileage) : null;
  const exitKm = exitMileage ? parseFloat(exitMileage) : null;
  const kmDiff = entryKm != null && exitKm != null ? exitKm - entryKm : null;

  const totalExitMarks = exitInspectionData?.marks?.length || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl(`ServiceOrderDetail?id=${orderId}`))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LogOut className="h-6 w-6 text-teal-500" />
            Inspección de Salida
          </h1>
          <p className="text-sm text-slate-500">Registrá el km de salida, verificá el estado del vehículo y confirmá la entrega</p>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-teal-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</span>
            </div>
            <p className="font-semibold text-slate-800">{order.customer_name || "—"}</p>
            {order.customer_phone && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" />{order.customer_phone}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <Car className="h-4 w-4 text-teal-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehículo</span>
            </div>
            <p className="font-semibold text-slate-800">
              {[order.car_brand, order.car_model].filter(Boolean).join(" ") || "—"}
            </p>
            <p className="text-sm text-slate-500">{order.car_plate || "—"}</p>
          </div>
        </div>
        {order.order_number && (
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t">Orden #{order.order_number}</p>
        )}
      </div>

      {/* Kilometraje comparativo */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-teal-500" />
          <h2 className="font-semibold text-slate-800">Kilometraje</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Entrada</p>
            <p className="text-xl font-bold text-slate-700">
              {entryKm != null ? Number(entryKm).toLocaleString() : "—"}
            </p>
            <p className="text-xs text-slate-400">km</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exitMileage">Km de salida</Label>
            <Input
              id="exitMileage"
              type="number"
              placeholder="Ej: 85250"
              value={exitMileage}
              onChange={e => setExitMileage(e.target.value)}
              className="text-center font-bold text-lg"
            />
          </div>

          <div className={`rounded-xl p-3 text-center ${
            kmDiff == null ? "bg-slate-50" :
            kmDiff > 0 ? "bg-amber-50 border border-amber-200" :
            "bg-green-50 border border-green-200"
          }`}>
            <p className="text-xs text-slate-500 mb-1">Diferencia</p>
            {kmDiff != null ? (
              <div className="flex items-center justify-center gap-1">
                {kmDiff > 0 ? <TrendingUp className="h-4 w-4 text-amber-500" /> :
                 kmDiff < 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> :
                 <Minus className="h-4 w-4 text-green-500" />}
                <p className={`text-xl font-bold ${
                  kmDiff > 0 ? "text-amber-700" :
                  kmDiff < 0 ? "text-red-700" : "text-green-700"
                }`}>
                  {kmDiff > 0 ? "+" : ""}{Number(kmDiff).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-xl font-bold text-slate-300">—</p>
            )}
            <p className="text-xs text-slate-400">km</p>
          </div>
        </div>

        {/* Observaciones de salida */}
        <div className="space-y-1.5 mt-4">
          <Label htmlFor="exitObservations">Observaciones de salida</Label>
          <Textarea
            id="exitObservations"
            placeholder="Ej: Se entregó con tanque lleno, cliente conforme con el trabajo..."
            value={exitObservations}
            onChange={e => setExitObservations(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Canvas de salida */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-1">Estado del vehículo al salir</h2>
        <p className="text-xs text-slate-400 mb-5">
          Marcá cualquier daño o novedad registrada al momento de la entrega. Si no hay novedades, dejá sin marcas.
        </p>
        <CarInspectionCanvas
          value={exitInspectionData}
          onChange={setExitInspectionData}
        />
      </div>

      {/* Botón confirmar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">
              {totalExitMarks > 0 ? `${totalExitMarks} novedad(es) marcada(s)` : "Sin novedades en salida"}
            </p>
            <p className="text-xs mt-0.5 text-slate-500">
              Al confirmar, la orden pasará a estado <span className="font-semibold text-teal-600">Entregado</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => navigate(createPageUrl(`ServiceOrderDetail?id=${orderId}`))}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={saving || saved}
              className={saved ? "bg-green-500 hover:bg-green-500" : "bg-teal-600 hover:bg-teal-700"}
            >
              {saved ? (
                <><CheckCircle className="h-4 w-4 mr-1.5" />¡Entregado!</>
              ) : saving ? "Guardando..." : (
                <><LogOut className="h-4 w-4 mr-1.5" />Confirmar Salida</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
