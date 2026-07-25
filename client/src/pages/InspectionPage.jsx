import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CarInspectionCanvas from "@/components/CarInspectionCanvas";
import { ArrowLeft, Car, User, Phone, Clock, CalendarDays, CheckCircle, ClipboardCheck } from "lucide-react";

export default function InspectionPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inspectionData, setInspectionData] = useState(null);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (!orderId) { navigate(createPageUrl("ServiceOrders")); return; }
    ServiceOrder.get(orderId).then(o => {
      setOrder(o);
      setObservations(o?.inspectionObservations || "");
      if (o?.inspectionData) {
        setInspectionData(JSON.parse(o.inspectionData));
      }
      setLoading(false);
    });
  }, [orderId]);

  const handleConfirm = async () => {
    setSaving(true);
    await ServiceOrder.update(orderId, {
      inspection_data: inspectionData ? JSON.stringify(inspectionData) : null,
      inspection_status: "inspected",
      inspection_observations: observations,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate(createPageUrl(`ServiceOrderDetail?id=${orderId}`)), 1200);
  };

  if (loading) return <div className="text-center py-16 text-slate-400">Cargando...</div>;
  if (!order) return <div className="text-center py-16 text-slate-400">Orden no encontrada</div>;

  const totalMarks = (inspectionData?.marks?.length || 0) +
    (inspectionData?.marksTop?.length || 0) +
    (inspectionData?.marksLeft?.length || 0) +
    (inspectionData?.marksRight?.length || 0);
  const hasClientSignature = !!inspectionData?.signature;
  const hasEmployeeSignature = !!inspectionData?.employeeSignature;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl(`ServiceOrderDetail?id=${orderId}`))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-[#E8461E]" />
            Inspección del Vehículo
          </h1>
          <p className="text-sm text-slate-500">Marcá los daños existentes y tomá la firma del cliente</p>
        </div>
      </div>

      {/* Info de la orden (solo lectura) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-[#E8461E]" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</span>
            </div>
            <p className="font-semibold text-slate-800">{order.customerName || "—"}</p>
            {order.customerPhone && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" />{order.customerPhone}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-4 w-4 text-[#E8461E]" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehículo</span>
            </div>
            <p className="font-semibold text-slate-800">
              {[order.carBrand, order.carModel].filter(Boolean).join(" ") || "—"}
            </p>
            {order.carPlate && (
              <p className="text-sm font-mono text-slate-600 mt-0.5">{order.carPlate}</p>
            )}
            {order.carMileage > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{Number(order.carMileage).toLocaleString()} km</p>
            )}
          </div>
        </div>
        {(order.entryDate || order.appointmentTime) && (
          <div className="mt-3 pt-3 border-t flex items-center gap-3">
            <CalendarDays className="h-3.5 w-3.5 text-[#E8461E]" />
            <span className="text-xs text-slate-500">
              {order.entryDate && new Date(order.entryDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              {order.appointmentTime && ` · ${order.appointmentTime} hs`}
            </span>
            {order.orderNumber && (
              <span className="text-xs text-slate-400 ml-auto">Orden #{order.orderNumber}</span>
            )}
          </div>
        )}
      </div>

      {/* Canvas de inspección */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-1">Marcar daños en el vehículo</h2>
        <p className="text-xs text-slate-400 mb-5">
          Tocá sobre el auto para marcar cada daño o rayón existente. Luego tomá la firma del cliente.
        </p>
        <CarInspectionCanvas
          value={inspectionData}
          onChange={setInspectionData}
        />
      </div>

      {/* Observaciones */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="observations">Observaciones generales</Label>
          <Textarea
            id="observations"
            placeholder="Ej: El cliente menciona ruido en frenos, rayón en puerta trasera derecha preexistente..."
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Botón confirmar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">
              {totalMarks > 0 ? `${totalMarks} daño(s) marcado(s)` : "Sin daños marcados"}
            </p>
            <p className="text-xs mt-0.5 text-slate-500">
              {hasClientSignature ? "✓ Firma cliente" : "✗ Sin firma cliente"}
              {" · "}
              {hasEmployeeSignature ? "✓ Firma empleado" : "✗ Sin firma empleado"}
            </p>
            {(!hasClientSignature || !hasEmployeeSignature) && (
              <p className="text-xs text-amber-500 mt-0.5">Se recomienda registrar ambas firmas.</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => navigate(createPageUrl(`ServiceOrderDetail?id=${orderId}`))}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={saving || saved}
              className={saved ? "bg-green-500 hover:bg-green-500" : ""}
            >
              {saved ? (
                <><CheckCircle className="h-4 w-4 mr-1.5" />¡Confirmado!</>
              ) : saving ? "Guardando..." : (
                <><ClipboardCheck className="h-4 w-4 mr-1.5" />Confirmar Inspección</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
