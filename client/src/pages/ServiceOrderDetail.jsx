import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { Payment } from "@/entities/Payment";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaymentDialog from "@/components/PaymentDialog";
import { InspectionPreview } from "@/components/CarInspectionCanvas";

import {
  ArrowLeft, Pencil, Car, User, Wrench,
  Package, Clock, CheckCircle, XCircle, Printer, DollarSign,
  Banknote, CreditCard, ArrowLeftRight, Plus, ClipboardCheck, CalendarDays,
  LogOut, MessageCircle
} from "lucide-react";

const formatCurrency = (n) => `$ ${Number(n || 0).toLocaleString("es-UY", { minimumFractionDigits: 0 })}`;
const formatUSD = (n) => `US$ ${Number(n || 0).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-UY") : "-";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("es-UY", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "-";

const STATUS_CONFIG = {
  pending:     { label: "Pendiente",   color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  in_progress: { label: "En proceso", color: "bg-blue-100 text-blue-700 border-blue-200",       icon: Wrench },
  ready:       { label: "Listo",       color: "bg-green-100 text-green-700 border-green-200",   icon: CheckCircle },
  delivered:   { label: "Entregado",  color: "bg-slate-100 text-slate-600 border-slate-200",    icon: CheckCircle },
  cancelled:   { label: "Cancelado",  color: "bg-red-100 text-red-600 border-red-200",          icon: XCircle },
};

const PAYMENT_STATUS_CONFIG = {
  unpaid:  { label: "Sin pagar",     color: "bg-red-100 text-red-700 border-red-200" },
  partial: { label: "Pago parcial",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  paid:    { label: "Pagado",        color: "bg-green-100 text-green-700 border-green-200" },
};

const METHOD_LABELS = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", pending: "Pendiente" };
const METHOD_ICONS = { cash: Banknote, card: CreditCard, transfer: ArrowLeftRight };

export default function ServiceOrderDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [warrantyPeriod, setWarrantyPeriod] = useState("12");

  const loadData = async () => {
    if (!orderId) { navigate(createPageUrl("ServiceOrders")); return; }
    const [orderData, paymentData] = await Promise.all([
      ServiceOrder.get(orderId),
      Payment.filter({ service_order_id: orderId }, "-paid_at", 50),
    ]);
    setOrder(orderData);
    setPayments(paymentData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [orderId]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    await ServiceOrder.update(orderId, { status: newStatus });
    setOrder({ ...order, status: newStatus });
    setUpdatingStatus(false);
  };

  const handlePaymentSaved = (updatedOrder) => {
    setOrder(updatedOrder);
    loadData();
  };

  const handleWhatsApp = () => {
    if (!order.customerPhone) return;
    const raw = order.customerPhone.replace(/\D/g, "");
    // Normalize Uruguay numbers: if starts with 598 use as is, else prepend 598
    const phone = raw.startsWith("598") ? raw : `598${raw}`;
    const vehicle = [order.carBrand, order.carModel, order.carPlate].filter(Boolean).join(" ");
    const msg = encodeURIComponent(
      `Hola ${order.customerName || ""}! Tu vehículo${vehicle ? ` (${vehicle})` : ""} está listo para retirar en el taller. 🔧`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;
  if (!order) return <div className="text-center py-12 text-slate-400">Orden no encontrada</div>;

  const services = JSON.parse(order.services || "[]");
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const inspectionData = order.inspectionData ? JSON.parse(order.inspectionData) : null;
  const paymentStatusCfg = PAYMENT_STATUS_CONFIG[order.paymentStatus || "unpaid"];
  const remaining = (order.totalSale || 0) - (order.paidAmount || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Logo solo visible al imprimir */}
      <div className="print-logo-header">
        <img src="/nexor-logo-dark.svg" alt="Nexor" style={{ height: "48px" }} />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("ServiceOrders"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">{order.carPlate || "Sin patente"}</h1>
              {order.orderNumber && <span className="text-sm text-slate-400">#{order.orderNumber}</span>}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />{cfg.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${paymentStatusCfg.color}`}>
                {paymentStatusCfg.label}
              </span>
              {order.inspectionStatus === "inspected" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-[#E8461E]/5 text-[#c73a15] border-orange-200">
                  <ClipboardCheck className="h-3.5 w-3.5" />Inspeccionado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                  <Clock className="h-3.5 w-3.5" />Sin inspección
                </span>
              )}
              {order.exitInspectionStatus === "exited" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-teal-50 text-teal-700 border-teal-200">
                  <LogOut className="h-3.5 w-3.5" />Salida registrada
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {[order.carBrand, order.carModel, order.carYear].filter(Boolean).join(" ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap print:hidden">
          {order.inspectionStatus !== "inspected" && (
            <Button size="sm" variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => navigate(createPageUrl(`InspectionPage?id=${orderId}`))}>
              <ClipboardCheck className="h-4 w-4 mr-1" />Inspeccionar
            </Button>
          )}
          {order.status === "ready" && order.customerPhone && (
            <Button size="sm" variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-1" />Notificar
            </Button>
          )}
          {order.status === "ready" && order.exitInspectionStatus !== "exited" && (
            <Button size="sm" variant="outline"
              className="border-teal-300 text-teal-700 hover:bg-teal-50"
              onClick={() => navigate(createPageUrl(`ExitInspectionPage?id=${orderId}`))}>
              <LogOut className="h-4 w-4 mr-1" />Salida
            </Button>
          )}
          <div className="flex items-center gap-1 print:hidden">
            <select
              value={warrantyPeriod}
              onChange={e => setWarrantyPeriod(e.target.value)}
              className="h-8 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-600"
              title="Plazo de garantía"
            >
              <option value="3">Garantía 3 meses</option>
              <option value="6">Garantía 6 meses</option>
              <option value="12">Garantía 1 año</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Imprimir
          </Button>
          <Button size="sm" onClick={() => navigate(createPageUrl(`NewServiceOrder?id=${orderId}`))}>
            <Pencil className="h-4 w-4 mr-1" />Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Car + Customer */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4 text-[#E8461E]" />Vehículo
                </h3>
                <div className="space-y-1.5 text-sm">
                  {[
                    ["Patente", <span className="font-bold text-slate-800">{order.carPlate || "-"}</span>],
                    ["Marca/Modelo", [order.carBrand, order.carModel].filter(Boolean).join(" ") || "-"],
                    ["Año", order.carYear || "-"],
                    ["Color", order.carColor || "-"],
                    ["Kilometraje", order.carMileage ? `${Number(order.carMileage).toLocaleString()} km` : "-"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-slate-700">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#E8461E]" />Cliente
                </h3>
                <div className="space-y-1.5 text-sm">
                  {[
                    ["Nombre", <span className="font-medium text-slate-800">{order.customerName || "-"}</span>],
                    ["Teléfono", order.customerPhone || "-"],
                    ["Ingreso", formatDate(order.entryDate)],
                    ["Hora cita", order.appointmentTime ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#c73a15] bg-[#E8461E]/5 px-2 py-0.5 rounded-full border border-orange-200 text-xs">
                        <Clock className="h-3 w-3" />{order.appointmentTime} hs
                      </span>
                    ) : "-"],
                    ["Entrega est.", formatDate(order.deliveryDate)],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-slate-700">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {order.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-slate-500 mb-1">Notas</p>
                <p className="text-sm text-slate-700">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Services */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[#E8461E]" />Servicios Realizados
            </h3>
            {services.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin servicios registrados</p>
            ) : (
              <div className="space-y-3">
                {services.map((svc, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[#E8461E]/10 rounded-lg flex items-center justify-center">
                          <Wrench className="h-3.5 w-3.5 text-[#E8461E]" />
                        </div>
                        <span className="font-semibold text-slate-800">{svc.service_name}</span>
                      </div>
                      <span className="font-bold text-slate-800 text-lg">{formatCurrency(svc.sale_price)}</span>
                    </div>
                    {svc.products?.length > 0 && (
                      <div className="space-y-1">
                        {svc.products.map((p, pi) => (
                          <div key={pi} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <Package className="h-3.5 w-3.5 text-slate-400" />{p.product_name}
                            </span>
                            <span className="text-slate-500">x{p.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#E8461E]" />Pagos
              </h3>
              {order.paymentStatus !== "paid" && (
                <Button size="sm" className="print:hidden" onClick={() => setShowPaymentDialog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Registrar Pago
                </Button>
              )}
            </div>

            {/* Payment summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-bold text-slate-800">{formatCurrency(order.totalSale)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Pagado</p>
                <p className="font-bold text-green-700">{formatCurrency(order.paidAmount)}</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${remaining > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className="text-xs text-slate-500">Saldo</p>
                <p className={`font-bold ${remaining > 0 ? "text-red-700" : "text-green-700"}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>

            {/* Payment list */}
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin pagos registrados</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => {
                  const Icon = METHOD_ICONS[p.paymentMethod] || Banknote;
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                          <Icon className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{METHOD_LABELS[p.paymentMethod]}</p>
                          <p className="text-xs text-slate-400">{formatDateTime(p.paidAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 text-sm">
                          {p.currency === "USD" ? formatUSD(p.amount) : formatCurrency(p.amount)}
                        </p>
                        {p.currency === "USD" && (
                          <p className="text-[11px] text-slate-400">≈ {formatCurrency(p.amountUyuEquivalent)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inspection */}
          <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm ${inspectionData ? "print:break-before-page" : ""}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-[#E8461E]" />Inspección del Vehículo
              </h3>
              {order.inspectionStatus !== "inspected" ? (
                <button
                  onClick={() => navigate(createPageUrl(`InspectionPage?id=${orderId}`))}
                  className="print:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold transition-colors"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />Realizar Inspección
                </button>
              ) : (
                <button
                  onClick={() => navigate(createPageUrl(`InspectionPage?id=${orderId}`))}
                  className="print:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8461E]/5 hover:bg-[#E8461E]/10 border border-orange-200 text-[#c73a15] text-xs font-semibold transition-colors"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />Ver / Editar
                </button>
              )}
            </div>
            {!inspectionData ? (
              <div className="text-center py-8 text-slate-400">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Inspección pendiente</p>
                <p className="text-xs mt-1">Se realiza cuando el auto llega al taller</p>
              </div>
            ) : (
              <div className="space-y-4">
                <InspectionPreview value={inspectionData} />
                <div className="grid grid-cols-2 gap-4">
                  {inspectionData.signature && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Firma del cliente</p>
                      <img src={inspectionData.signature} alt="Firma cliente" className="max-h-24 object-contain rounded-lg border border-slate-100 bg-slate-50 w-full" />
                    </div>
                  )}
                  {inspectionData.employeeSignature && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Firma del empleado</p>
                      <img src={inspectionData.employeeSignature} alt="Firma empleado" className="max-h-24 object-contain rounded-lg border border-slate-100 bg-slate-50 w-full" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Exit Inspection */}
          {(order.status === "ready" || order.status === "delivered" || order.exitInspectionStatus === "exited") && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-teal-500" />Inspección de Salida
                </h3>
                {order.exitInspectionStatus !== "exited" ? (
                  <button
                    onClick={() => navigate(createPageUrl(`ExitInspectionPage?id=${orderId}`))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-xs font-semibold transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />Registrar Salida
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(createPageUrl(`ExitInspectionPage?id=${orderId}`))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-xs font-semibold transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />Ver / Editar
                  </button>
                )}
              </div>
              {order.exitInspectionStatus !== "exited" ? (
                <div className="text-center py-8 text-slate-400">
                  <LogOut className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Salida pendiente</p>
                  <p className="text-xs mt-1">Se registra cuando el auto se entrega al cliente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {order.carMileageExit > 0 && (
                    <div className="flex items-center justify-between bg-teal-50 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Km de salida</p>
                        <p className="text-xl font-bold text-teal-800">{Number(order.carMileageExit).toLocaleString()} km</p>
                      </div>
                      {order.carMileage > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-teal-600">Km entrada</p>
                          <p className="text-sm font-medium text-teal-700">{Number(order.carMileage).toLocaleString()} km</p>
                          <p className="text-xs text-teal-500">+{Number(order.carMileageExit - order.carMileage).toLocaleString()} km en taller</p>
                        </div>
                      )}
                    </div>
                  )}
                  {order.exitObservations && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Observaciones de salida</p>
                      <p className="text-sm text-slate-700">{order.exitObservations}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm print:hidden">
            <h3 className="font-semibold text-slate-700 mb-3">Estado de la Orden</h3>
            <Select value={order.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En proceso</SelectItem>
                <SelectItem value="ready">Listo</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Total + payment status */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Total de la orden</p>
            <p className="text-3xl font-bold text-slate-800">{formatCurrency(order.totalSale)}</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pagado</span>
                <span className="font-medium text-green-600">{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Saldo</span>
                <span className={`font-bold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
            <div className={`mt-3 px-3 py-2 rounded-lg text-center text-xs font-semibold border ${paymentStatusCfg.color}`}>
              {paymentStatusCfg.label}
            </div>
            {order.paymentStatus !== "paid" && (
              <Button className="w-full mt-3 print:hidden" size="sm" onClick={() => setShowPaymentDialog(true)}>
                <DollarSign className="h-3.5 w-3.5 mr-1" />Registrar Pago
              </Button>
            )}
          </div>

          <Button variant="outline" className="w-full print:hidden" onClick={() => navigate(createPageUrl("ServiceOrders"))}>
            Volver a la lista
          </Button>
        </div>
      </div>


      {/* Póliza de Garantía - solo visible al imprimir */}
      <div className="hidden print:block print:break-before-page">
        <img src={`/garantia-${warrantyPeriod}.png`} alt="Póliza de Garantía" style={{ width: "100%", display: "block" }} />
      </div>

      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        order={order}
        onPaymentSaved={handlePaymentSaved}
      />

    </div>
  );
}