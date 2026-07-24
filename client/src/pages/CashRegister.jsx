import { useState, useEffect, useRef } from "react";
import { CashRegister } from "@/entities/CashRegister";
import { Payment } from "@/entities/Payment";
import { CashMovement } from "@/entities/CashMovement";
import { ServiceOrder } from "@/entities/ServiceOrder";
import User from "@/entities/User";
import { useCashRegister } from "@/context/CashRegisterContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Wallet, Plus, Lock, Banknote, CreditCard, ArrowLeftRight,
  Calendar, ChevronDown, ChevronUp, CheckCircle, Car, Printer,
  TrendingUp, TrendingDown, Minus, Info, ArrowDownLeft, ArrowUpRight,
  Hash, UserCheck, XCircle, Trash2, ChevronRight, Package, Wrench
} from "lucide-react";

const fmtUYU = (n) => `$ ${Number(n || 0).toLocaleString("es-UY", { minimumFractionDigits: 0 })}`;
const fmtUSD = (n) => `US$ ${Number(n || 0).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => {
  if (!d) return "-";
  const dateStr = d.split("T")[0];
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-UY", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};
const fmtDateShort = (d) => {
  if (!d) return "-";
  const dateStr = d.split("T")[0];
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-UY");
};
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("es-UY", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "-";

const METHOD_LABELS = { cash: "Efectivo", card: "Tarjeta", card_credit: "Tarjeta Crédito", card_debit: "Tarjeta Débito", transfer: "Transferencia", mercado_pago: "Mercado Pago", check: "Cheque", other: "Otro" };
const METHOD_ICONS = { cash: Banknote, card: CreditCard, card_credit: CreditCard, card_debit: CreditCard, transfer: ArrowLeftRight, mercado_pago: ArrowLeftRight };

const isCash = (type) => type === "cash";

function buildMethodList(payments) {
  const totals = payments.reduce((acc, p) => {
    const key = `${p.payment_method}_${p.currency}`;
    if (!acc[key]) acc[key] = {
      key,
      type: p.payment_method,
      currency: p.currency,
      label: METHOD_LABELS[p.payment_method] || p.payment_method,
      total: 0,
      uyu_equivalent: 0,
    };
    acc[key].total += Number(p.amount) || 0;
    if (p.currency === "USD") acc[key].uyu_equivalent += Number(p.amount_uyu_equivalent) || 0;
    return acc;
  }, {});
  return Object.values(totals).sort((a, b) => {
    if (isCash(a.type) !== isCash(b.type)) return isCash(a.type) ? -1 : 1;
    if (a.currency !== b.currency) return a.currency === "UYU" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

// Suma ingresos y egresos manuales por moneda
function calcMovementTotals(movements) {
  return movements.reduce((acc, m) => {
    const isIngreso = m.type === "ingreso";
    if (m.currency === "UYU") {
      if (isIngreso) acc.ingresoUYU += Number(m.amount);
      else acc.egresoUYU += Number(m.amount);
    } else {
      if (isIngreso) acc.ingresoUSD += Number(m.amount);
      else acc.egresoUSD += Number(m.amount);
    }
    return acc;
  }, { ingresoUYU: 0, egresoUYU: 0, ingresoUSD: 0, egresoUSD: 0 });
}

// Fórmula: fondo + TODOS los pagos recibidos + ingresos manuales - egresos manuales
function calcExpected(register, payments, movements) {
  const methodList = buildMethodList(payments);
  // Total de todos los métodos por moneda (no solo efectivo)
  const allUYU = methodList.filter(m => m.currency === "UYU").reduce((s, m) => s + m.total, 0);
  const allUSD = methodList.filter(m => m.currency === "USD").reduce((s, m) => s + m.total, 0);
  // Solo efectivo (para desglose)
  const cashUYU = methodList.find(m => isCash(m.type) && m.currency === "UYU")?.total || 0;
  const cashUSD = methodList.find(m => isCash(m.type) && m.currency === "USD")?.total || 0;
  const { ingresoUYU, egresoUYU, ingresoUSD, egresoUSD } = calcMovementTotals(movements);
  return {
    allUYU,
    allUSD,
    cashUYU,
    cashUSD,
    ingresoUYU,
    egresoUYU,
    ingresoUSD,
    egresoUSD,
    expectedCashUYU: (register.petty_cash_uyu || 0) + allUYU + ingresoUYU - egresoUYU,
    expectedCashUSD: (register.petty_cash_usd || 0) + allUSD + ingresoUSD - egresoUSD,
  };
}

// Combina pagos y movimientos en una lista ordenada por tiempo
function buildCombinedList(payments, movements) {
  const items = [
    ...payments.map(p => ({ ...p, _kind: "payment", _ts: p.paid_at })),
    ...movements.map(m => ({ ...m, _kind: "movement", _ts: m.moved_at })),
  ];
  return items.sort((a, b) => new Date(b._ts) - new Date(a._ts));
}

// Calcula totales de mano de obra vs insumos a partir de las órdenes del día
// sale_price del producto = precio de venta al público del insumo
// sale_price del servicio = total que paga el cliente por ese servicio
// mano de obra = sale_price servicio - suma sale_price productos
function calcConceptTotals(orders) {
  let totalInsumos = 0;
  let totalManoDeObra = 0;
  let totalServicios = 0;

  for (const order of orders) {
    const services = typeof order.services === "string" ? JSON.parse(order.services || "[]") : order.services || [];
    for (const svc of services) {
      const salePrice = Number(svc.sale_price) || 0;
      totalServicios += salePrice;
      const products = svc.products || [];
      const productsTotal = products.reduce((s, p) => {
        const pSalePrice = Number(p.sale_price) || Number(p.cost_price) || 0;
        return s + pSalePrice * (Number(p.quantity) || 1);
      }, 0);
      totalInsumos += productsTotal;
      totalManoDeObra += Math.max(0, salePrice - productsTotal);
    }
  }

  return { totalInsumos, totalManoDeObra, totalServicios };
}

// ─── PIN Modal ────────────────────────────────────────────────────────────────
function PinModal({ title, onConfirm, onClose }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const handleSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError("");
    try {
      const user = await User.verifyPin(pin);
      onConfirm(user);
    } catch {
      setError("PIN incorrecto");
      setPin("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <Hash className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{title}</p>
              <p className="text-xs text-slate-400">Ingresá tu PIN de caja</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <Input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••"
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          className="text-center text-2xl tracking-widest mb-3 h-12"
        />

        {error && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs mb-3 bg-red-50 rounded-lg px-3 py-2">
            <XCircle className="h-3.5 w-3.5 flex-shrink-0" />{error}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading || pin.length < 4}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {loading ? "Verificando..." : <><UserCheck className="h-4 w-4 mr-2" />Confirmar</>}
        </Button>
      </div>
    </div>
  );
}

function PaymentRow({ payment }) {
  const Icon = METHOD_ICONS[payment.payment_method] || Banknote;
  const [expanded, setExpanded] = useState(false);
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const toggleDetail = async () => {
    if (expanded) { setExpanded(false); return; }
    if (!payment.service_order_id) { setExpanded(true); return; }
    if (order) { setExpanded(true); return; }
    setLoadingOrder(true);
    try {
      const o = await ServiceOrder.get(payment.service_order_id);
      setOrder(o);
    } catch { /* ignore */ }
    setLoadingOrder(false);
    setExpanded(true);
  };

  const services = order ? (typeof order.services === "string" ? JSON.parse(order.services || "[]") : order.services || []) : [];

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={toggleDetail}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{payment.car_plate || "—"}</span>
              <span className="text-xs text-slate-400">{payment.customer_name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-400">{METHOD_LABELS[payment.payment_method] || payment.payment_method}</span>
              <span className="text-[11px] text-slate-300">·</span>
              <span className="text-[11px] text-slate-400">{fmtDateTime(payment.paid_at)}</span>
              {payment.order_number && (
                <><span className="text-[11px] text-slate-300">·</span>
                <span className="text-[11px] text-slate-400">#{payment.order_number}</span></>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-bold text-slate-800 text-sm">
              {payment.currency === "USD" ? fmtUSD(payment.amount) : fmtUYU(payment.amount)}
            </p>
            {payment.currency === "USD" && (
              <p className="text-[11px] text-slate-400">≈ {fmtUYU(payment.amount_uyu_equivalent)}</p>
            )}
          </div>
          {payment.service_order_id && (
            <ChevronRight className={`h-3.5 w-3.5 text-slate-300 transition-transform ${expanded ? "rotate-90" : ""}`} />
          )}
        </div>
      </div>

      {expanded && payment.service_order_id && (
        <div className="ml-11 mr-2 mb-2.5 bg-slate-50 rounded-lg p-3 space-y-2">
          {loadingOrder ? (
            <p className="text-xs text-slate-400">Cargando detalle...</p>
          ) : services.length === 0 ? (
            <p className="text-xs text-slate-400">Sin detalle de servicios</p>
          ) : (
            services.map((svc, i) => {
              const products = svc.products || [];
              const productsTotal = products.reduce((s, p) => {
                const pPrice = Number(p.sale_price) || Number(p.cost_price) || 0;
                return s + pPrice * (Number(p.quantity) || 1);
              }, 0);
              const laborEstimate = (svc.sale_price || 0) - productsTotal;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="h-3 w-3 text-orange-500" />
                      <span className="text-xs font-semibold text-slate-700">{svc.service_name || "Servicio"}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{fmtUYU(svc.sale_price)}</span>
                  </div>
                  {products.length > 0 && (
                    <div className="ml-4 space-y-0.5">
                      {products.map((p, j) => {
                        const pPrice = Number(p.sale_price) || Number(p.cost_price) || 0;
                        return (
                          <div key={j} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1 text-slate-500">
                              <Package className="h-2.5 w-2.5" />
                              <span>{p.product_name} x{p.quantity || 1}</span>
                            </div>
                            <span className="text-slate-500">{fmtUYU(pPrice * (Number(p.quantity) || 1))}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {laborEstimate > 0 && (
                    <div className="ml-4 flex items-center justify-between text-[11px]">
                      <span className="text-orange-600 font-medium">Mano de obra</span>
                      <span className="text-orange-600 font-medium">{fmtUYU(laborEstimate)}</span>
                    </div>
                  )}
                  {i < services.length - 1 && <div className="border-b border-slate-200 mt-1" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MovementRow({ movement }) {
  const isIngreso = movement.type === "ingreso";
  const Icon = isIngreso ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isIngreso ? "bg-green-100" : "bg-red-100"}`}>
          <Icon className={`h-3.5 w-3.5 ${isIngreso ? "text-green-600" : "text-red-500"}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{movement.concept}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isIngreso ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {isIngreso ? "Ingreso" : "Egreso"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-slate-400">{movement.created_by || "Movimiento manual"}</span>
            <span className="text-[11px] text-slate-300">·</span>
            <span className="text-[11px] text-slate-400">{fmtDateTime(movement.moved_at)}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold text-sm ${isIngreso ? "text-green-700" : "text-red-600"}`}>
          {isIngreso ? "+" : "-"}{movement.currency === "USD" ? fmtUSD(movement.amount) : fmtUYU(movement.amount)}
        </p>
      </div>
    </div>
  );
}

// ─── Print component ─────────────────────────────────────────────────────────
function PrintView({ register, payments, movements, orders }) {
  if (!register) return null;
  const pettyCashUYU = Number(f(register, "petty_cash_uyu")) || 0;
  const pettyCashUSD = Number(f(register, "petty_cash_usd")) || 0;
  const regForCalc = { ...register, petty_cash_uyu: pettyCashUYU, petty_cash_usd: pettyCashUSD };
  const { allUYU, allUSD, cashUYU, cashUSD, ingresoUYU, egresoUYU, ingresoUSD, egresoUSD, expectedCashUYU, expectedCashUSD } = calcExpected(regForCalc, payments, movements);
  const methodList = buildMethodList(payments);
  const closingUYU = Number(f(register, "closing_balance_uyu")) || 0;
  const closingUSD = Number(f(register, "closing_balance_usd")) || 0;
  const diffUYU = closingUYU - expectedCashUYU;
  const diffUSD = closingUSD - expectedCashUSD;
  const isClosed = f(register, "status") === "closed";

  // Agrupar pagos por orden para el detalle de servicios
  const orderMap = {};
  for (const o of (orders || [])) {
    orderMap[o.id] = o;
  }
  const paymentsByOrder = {};
  for (const p of payments) {
    const key = p.service_order_id || "_sin_orden";
    if (!paymentsByOrder[key]) paymentsByOrder[key] = [];
    paymentsByOrder[key].push(p);
  }

  const S = {
    row: { display: "flex", justifyContent: "space-between", marginBottom: 2 },
    label: { color: "#64748b" },
    bold: { fontWeight: "bold" },
    sep: { borderTop: "1px solid #e2e8f0", paddingTop: 4, marginTop: 4 },
    green: { color: "#16a34a" },
    red: { color: "#dc2626" },
    section: { marginBottom: 16 },
    sectionTitle: { fontWeight: "bold", marginBottom: 8, fontSize: 13, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 },
  };

  return (
    <div id="cash-print" className="cash-print-hidden">
      <style>{`
        .cash-print-hidden { position: absolute; left: -9999px; top: 0; width: 210mm; font-family: sans-serif; font-size: 11px; color: #1e293b; }
        @media print {
          body > *:not(:has(#cash-print)) { display: none !important; }
          body * { visibility: hidden !important; }
          .cash-print-hidden, .cash-print-hidden * { visibility: visible !important; }
          .cash-print-hidden { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20px !important; z-index: 99999; background: white; }
        }
      `}</style>

      {/* 1. ENCABEZADO */}
      <div style={{ borderBottom: "2px solid #1e293b", paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: "bold", margin: 0 }}>CIERRE DE CAJA</h1>
            <p style={{ color: "#64748b", margin: "2px 0 0" }}>Taller</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontWeight: "bold", fontSize: 13 }}>{fmtDateShort(f(register, "date"))}</p>
            <p style={{ color: "#64748b" }}>Apertura: {fmtDateTime(f(register, "opened_at"))}</p>
            {f(register, "opened_by") && <p style={{ color: "#64748b" }}>Cajero: {f(register, "opened_by")}</p>}
            {f(register, "closed_at") && <p style={{ color: "#64748b" }}>Cierre: {fmtDateTime(f(register, "closed_at"))}</p>}
            {f(register, "closed_by") && <p style={{ color: "#64748b" }}>Cerrado por: {f(register, "closed_by")}</p>}
          </div>
        </div>
      </div>

      {/* 2. DETALLE DE OPERACIONES — por orden de servicio */}
      <div style={S.section}>
        <p style={S.sectionTitle}>Detalle de operaciones</p>
        {Object.entries(paymentsByOrder).map(([orderId, orderPayments]) => {
          const order = orderMap[orderId];
          const services = order ? (typeof order.services === "string" ? JSON.parse(order.services || "[]") : order.services || []) : [];
          return (
            <div key={orderId} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 8, marginBottom: 8 }}>
              {/* Datos del vehículo / cliente */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div>
                  <span style={{ fontWeight: "bold", fontSize: 12 }}>
                    {order ? `${order.car_plate || "—"}` : orderPayments[0]?.car_plate || "—"}
                  </span>
                  <span style={{ color: "#64748b", marginLeft: 8 }}>
                    {order ? (order.customer_name || "") : (orderPayments[0]?.customer_name || "")}
                  </span>
                  {order && (order.car_brand || order.car_model) && (
                    <span style={{ color: "#94a3b8", marginLeft: 8, fontSize: 10 }}>
                      {[order.car_brand, order.car_model].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
                {order?.order_number && <span style={{ color: "#64748b", fontSize: 10 }}>#{order.order_number}</span>}
              </div>

              {/* Servicios realizados */}
              {services.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  {services.map((svc, si) => (
                    <div key={si} style={{ marginBottom: 3, paddingLeft: 8, borderLeft: "2px solid #f1f5f9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 500 }}>{svc.service_name}</span>
                        <span style={{ fontWeight: 500 }}>{fmtUYU(Number(svc.sale_price) || 0)}</span>
                      </div>
                      {(svc.products || []).length > 0 && (
                        <div style={{ paddingLeft: 8, fontSize: 10, color: "#64748b" }}>
                          {svc.products.map((p, pi) => (
                            <div key={pi} style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>{p.product_name} x{p.quantity || 1}</span>
                              <span>{fmtUYU((Number(p.sale_price) || Number(p.cost_price) || 0) * (Number(p.quantity) || 1))}</span>
                            </div>
                          ))}
                          {(Number(svc.labor_cost) || 0) > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Mano de obra</span>
                              <span>{fmtUYU(Number(svc.labor_cost))}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagos de esta orden */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 3 }}>
                {orderPayments.map((p, pi) => (
                  <div key={pi} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569" }}>
                    <span>{METHOD_LABELS[p.payment_method] || p.payment_method} · {fmtDateTime(p.paid_at)}</span>
                    <span style={{ fontWeight: "bold" }}>{p.currency === "USD" ? fmtUSD(p.amount) : fmtUYU(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. INGRESOS / EGRESOS MANUALES */}
      {movements.length > 0 && (
        <div style={S.section}>
          <p style={S.sectionTitle}>Movimientos manuales ({movements.length})</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                <th style={{ textAlign: "left", padding: "3px 6px 3px 0" }}>Concepto</th>
                <th style={{ textAlign: "left", padding: "3px 6px" }}>Tipo</th>
                <th style={{ textAlign: "left", padding: "3px 6px" }}>Hora</th>
                <th style={{ textAlign: "right", padding: "3px 0 3px 6px" }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "2px 6px 2px 0" }}>{m.concept}</td>
                  <td style={{ padding: "2px 6px", color: m.type === "ingreso" ? "#16a34a" : "#dc2626" }}>
                    {m.type === "ingreso" ? "Ingreso" : "Egreso"}
                  </td>
                  <td style={{ padding: "2px 6px", color: "#64748b" }}>{fmtDateTime(m.moved_at)}</td>
                  <td style={{ padding: "2px 0 2px 6px", textAlign: "right", fontWeight: "bold", color: m.type === "ingreso" ? "#16a34a" : "#dc2626" }}>
                    {m.type === "ingreso" ? "+" : "-"}{m.currency === "USD" ? fmtUSD(m.amount) : fmtUYU(m.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. RESUMEN POR MÉTODO DE PAGO */}
      <div style={S.section}>
        <p style={S.sectionTitle}>Resumen por método de pago</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <tbody>
            {methodList.map(m => (
              <tr key={m.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "3px 6px 3px 0", fontWeight: 500 }}>{m.label}</td>
                <td style={{ padding: "3px 6px", color: "#64748b" }}>{m.currency === "USD" ? "USD" : "UYU"}</td>
                <td style={{ padding: "3px 0 3px 6px", textAlign: "right", fontWeight: "bold" }}>
                  {m.currency === "USD" ? fmtUSD(m.total) : fmtUYU(m.total)}
                </td>
              </tr>
            ))}
            {/* Total recaudado */}
            <tr style={{ borderTop: "2px solid #cbd5e1" }}>
              <td style={{ padding: "4px 6px 4px 0", fontWeight: "bold" }}>Total recaudado</td>
              <td style={{ padding: "4px 6px", color: "#64748b" }}>UYU</td>
              <td style={{ padding: "4px 0 4px 6px", textAlign: "right", fontWeight: "bold" }}>{fmtUYU(allUYU)}</td>
            </tr>
            {allUSD > 0 && (
              <tr>
                <td style={{ padding: "2px 6px 2px 0", fontWeight: "bold" }}>Total recaudado</td>
                <td style={{ padding: "2px 6px", color: "#64748b" }}>USD</td>
                <td style={{ padding: "2px 0 2px 6px", textAlign: "right", fontWeight: "bold" }}>{fmtUSD(allUSD)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. TOTALES — ESPERADO EN CAJA */}
      <div style={{ border: "1px solid #1e293b", borderRadius: 8, padding: 10, marginBottom: 16 }}>
        <p style={{ fontWeight: "bold", marginBottom: 6, fontSize: 12 }}>Total esperado en caja</p>
        <div style={S.row}><span style={S.label}>Fondo fijo UYU</span><span>{fmtUYU(pettyCashUYU)}</span></div>
        <div style={S.row}><span style={S.label}>Recaudado UYU</span><span>{fmtUYU(allUYU)}</span></div>
        {ingresoUYU > 0 && <div style={S.row}><span style={S.green}>+ Ingresos manuales</span><span style={S.green}>+{fmtUYU(ingresoUYU)}</span></div>}
        {egresoUYU > 0 && <div style={S.row}><span style={S.red}>- Egresos manuales</span><span style={S.red}>-{fmtUYU(egresoUYU)}</span></div>}
        <div style={{ ...S.row, ...S.bold, ...S.sep }}><span>TOTAL ESPERADO UYU</span><span>{fmtUYU(expectedCashUYU)}</span></div>
        {isClosed && <div style={{ ...S.row }}>
          <span style={S.label}>Contado al cierre UYU</span><span>{fmtUYU(closingUYU)}</span>
        </div>}
        {isClosed && <div style={{ ...S.row, ...S.bold, color: diffUYU >= 0 ? "#16a34a" : "#dc2626" }}>
          <span>Diferencia UYU</span><span>{diffUYU >= 0 ? "+" : ""}{fmtUYU(diffUYU)}</span>
        </div>}

        {(pettyCashUSD > 0 || allUSD > 0 || ingresoUSD > 0 || egresoUSD > 0) && <>
          <div style={{ marginTop: 10 }} />
          <div style={S.row}><span style={S.label}>Fondo fijo USD</span><span>{fmtUSD(pettyCashUSD)}</span></div>
          <div style={S.row}><span style={S.label}>Recaudado USD</span><span>{fmtUSD(allUSD)}</span></div>
          {ingresoUSD > 0 && <div style={S.row}><span style={S.green}>+ Ingresos manuales</span><span style={S.green}>+{fmtUSD(ingresoUSD)}</span></div>}
          {egresoUSD > 0 && <div style={S.row}><span style={S.red}>- Egresos manuales</span><span style={S.red}>-{fmtUSD(egresoUSD)}</span></div>}
          <div style={{ ...S.row, ...S.bold, ...S.sep }}><span>TOTAL ESPERADO USD</span><span>{fmtUSD(expectedCashUSD)}</span></div>
          {isClosed && <div style={S.row}>
            <span style={S.label}>Contado al cierre USD</span><span>{fmtUSD(closingUSD)}</span>
          </div>}
          {isClosed && <div style={{ ...S.row, ...S.bold, color: diffUSD >= 0 ? "#16a34a" : "#dc2626" }}>
            <span>Diferencia USD</span><span>{diffUSD >= 0 ? "+" : ""}{fmtUSD(diffUSD)}</span>
          </div>}
        </>}
      </div>

      {/* 6. NOTAS */}
      {f(register, "notes") && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 16 }}>
          <p style={{ fontWeight: "bold", marginBottom: 4 }}>Notas de cierre</p>
          <p>{f(register, "notes")}</p>
        </div>
      )}

      {/* 7. FIRMAS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 40 }}>
        <div style={{ borderTop: "1px solid #94a3b8", paddingTop: 6, textAlign: "center", color: "#64748b", fontSize: 10 }}>Firma responsable de caja</div>
        <div style={{ borderTop: "1px solid #94a3b8", paddingTop: 6, textAlign: "center", color: "#64748b", fontSize: 10 }}>Firma supervisor</div>
      </div>
    </div>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────
function HistoryCard({ register, onPrint, onCloseRegister, isAdmin, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [payments, setPayments] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closingNotes, setClosingNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPayments = async () => {
    if (expanded) { setExpanded(false); return; }
    setLoadingPayments(true);
    const [pData, mData] = await Promise.all([
      Payment.filter({ cash_register_id: register.id }, "-paid_at", 100),
      CashMovement.filter({ cash_register_id: register.id }, "-moved_at", 100),
    ]);
    setPayments(pData);
    setMovements(mData);
    setLoadingPayments(false);
    setExpanded(true);
  };

  const combined = buildCombinedList(payments, movements);

  const handleForceClose = async () => {
    setSaving(true);
    const { expectedCashUYU, expectedCashUSD } = calcExpected(register, payments, movements);
    await onCloseRegister(register, expectedCashUYU, expectedCashUSD, closingNotes);
    setSaving(false);
    setShowCloseConfirm(false);
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${f(register, "status") === "open" ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={loadPayments}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${f(register, "status") === "open" ? "bg-red-100" : "bg-slate-100"}`}>
            <Lock className={`h-4 w-4 ${f(register, "status") === "open" ? "text-red-500" : "text-slate-500"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-800 text-sm capitalize">{fmtDate(f(register, "date"))}</p>
              {f(register, "status") === "open" && (
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Sin cerrar</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Apertura: {fmtDateTime(f(register, "opened_at"))}
              {f(register, "closed_at") && ` · Cierre: ${fmtDateTime(f(register, "closed_at"))}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">{fmtUYU(f(register, "total_uyu"))}</p>
            {(Number(f(register, "total_usd")) || 0) > 0 && <p className="text-xs text-slate-500">{fmtUSD(f(register, "total_usd"))}</p>}
          </div>
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar caja"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {loadingPayments ? (
            <p className="text-xs text-slate-400 py-3 text-center">Cargando...</p>
          ) : combined.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">Sin movimientos registrados</p>
          ) : (
            <div className="mt-2">
              {combined.map(item =>
                item._kind === "payment"
                  ? <PaymentRow key={item.id} payment={item} />
                  : <MovementRow key={item.id} movement={item} />
              )}
            </div>
          )}
          {f(register, "notes") && (
            <div className="mt-3 bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-500">{f(register, "notes")}</p>
            </div>
          )}
          {combined.length > 0 && (
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={(e) => { e.stopPropagation(); onPrint(register, payments, movements); }}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir cierre
            </Button>
          )}
          {f(register, "status") === "open" && !showCloseConfirm && (
            <Button
              size="sm"
              className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white"
              onClick={(e) => { e.stopPropagation(); setShowCloseConfirm(true); }}
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />Cerrar esta caja
            </Button>
          )}
          {showCloseConfirm && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-semibold text-red-700">Confirmar cierre de caja</p>
              <p className="text-xs text-red-600">Se cerrará sin arqueo. El sistema calculará el efectivo esperado automáticamente.</p>
              <div>
                <Label className="text-xs">Notas de cierre (opcional)</Label>
                <Textarea value={closingNotes} onChange={e => setClosingNotes(e.target.value)} rows={2} className="mt-1 text-sm" placeholder="Observaciones..." />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCloseConfirm(false)}>Cancelar</Button>
                <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={handleForceClose} disabled={saving}>
                  {saving ? "Cerrando..." : "Confirmar Cierre"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-red-700 font-medium">¿Eliminar esta caja permanentemente?</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowDeleteConfirm(false)}>No</Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await onDelete(register.id);
                setDeleting(false);
              }}
            >
              {deleting ? "..." : "Sí, eliminar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: accede a campo en snake_case o camelCase ────────────────────────
function f(obj, snake) {
  if (!obj) return undefined;
  if (obj[snake] !== undefined) return obj[snake];
  const camel = snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return obj[camel];
}

// ─── Today register view ──────────────────────────────────────────────────────
function TodayRegisterView({ register, payments, movements, orders, onPrint }) {
  const methodList = buildMethodList(payments);
  const pettyCashUYU = Number(f(register, "petty_cash_uyu")) || 0;
  const pettyCashUSD = Number(f(register, "petty_cash_usd")) || 0;
  const openedAt = f(register, "opened_at");
  const closedAt = f(register, "closed_at");
  const openedBy = f(register, "opened_by");
  const closedBy = f(register, "closed_by");
  const diffUYU = Number(f(register, "difference_uyu")) || 0;
  const diffUSD = Number(f(register, "difference_usd")) || 0;
  const totalUYU = Number(f(register, "total_uyu")) || 0;
  const totalUSD = Number(f(register, "total_usd")) || 0;

  const regForCalc = { ...register, petty_cash_uyu: pettyCashUYU, petty_cash_usd: pettyCashUSD };
  const { cashUYU, cashUSD, ingresoUYU, egresoUYU, ingresoUSD, egresoUSD, expectedCashUYU, expectedCashUSD } = calcExpected(regForCalc, payments, movements);
  const combined = buildCombinedList(payments, movements);
  const { totalInsumos, totalManoDeObra, totalServicios } = calcConceptTotals(orders);

  const isOpen = register.status === "open";

  return (
    <div className="space-y-4">
      {/* Status banner + datos de apertura/cierre */}
      <div className={`rounded-xl border overflow-hidden ${isOpen ? "border-green-200" : "border-slate-200"}`}>
        <div className={`flex items-center gap-3 px-4 py-3 ${isOpen ? "bg-green-50" : "bg-slate-50"}`}>
          {isOpen ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-slate-400" />}
          <p className={`font-semibold text-sm flex-1 ${isOpen ? "text-green-700" : "text-slate-600"}`}>
            Caja {isOpen ? "Abierta" : "Cerrada"}
          </p>
          {totalUYU > 0 && <p className="font-bold text-slate-800">{fmtUYU(totalUYU)}</p>}
        </div>
        <div className="bg-white px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div>
            <p className="text-slate-400">Apertura</p>
            <p className="font-medium text-slate-700">{fmtDateTime(openedAt)}</p>
            {openedBy && <p className="text-slate-400">{openedBy}</p>}
          </div>
          {!isOpen && (
            <div>
              <p className="text-slate-400">Cierre</p>
              <p className="font-medium text-slate-700">{fmtDateTime(closedAt)}</p>
              {closedBy && <p className="text-slate-400">{closedBy}</p>}
            </div>
          )}
          <div>
            <p className="text-slate-400">Fondo fijo UYU</p>
            <p className="font-medium text-slate-700">{fmtUYU(pettyCashUYU)}</p>
          </div>
          {pettyCashUSD > 0 && (
            <div>
              <p className="text-slate-400">Fondo fijo USD</p>
              <p className="font-medium text-slate-700">{fmtUSD(pettyCashUSD)}</p>
            </div>
          )}
          <div>
            <p className="text-slate-400">Total esperado en caja UYU</p>
            <p className="font-bold text-slate-800">{fmtUYU(expectedCashUYU)}</p>
          </div>
          {expectedCashUSD > 0 && (
            <div>
              <p className="text-slate-400">Total esperado en caja USD</p>
              <p className="font-bold text-slate-800">{fmtUSD(expectedCashUSD)}</p>
            </div>
          )}
          {!isOpen && (diffUYU !== 0 || diffUSD !== 0) && (
            <div className="col-span-2 pt-1 border-t border-slate-100">
              {diffUYU !== 0 && (
                <p className={`font-bold ${diffUYU >= 0 ? "text-green-700" : "text-red-600"}`}>
                  Diferencia UYU: {diffUYU >= 0 ? "+" : ""}{fmtUYU(diffUYU)}
                </p>
              )}
              {diffUSD !== 0 && (
                <p className={`font-bold ${diffUSD >= 0 ? "text-green-700" : "text-red-600"}`}>
                  Diferencia USD: {diffUSD >= 0 ? "+" : ""}{fmtUSD(diffUSD)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Per-method summary */}
      {methodList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumen por método de pago</p>
          </div>
          <div className="divide-y divide-slate-100">
            {methodList.map(m => {
              const Icon = METHOD_ICONS[m.type] || Banknote;
              const isUSD = m.currency === "USD";
              const cash = isCash(m.type);
              return (
                <div key={m.key} className={`flex items-center justify-between px-4 py-3 ${cash ? "" : "bg-slate-50/50"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cash ? "bg-green-100" : "bg-slate-100"}`}>
                      <Icon className={`h-3.5 w-3.5 ${cash ? "text-green-600" : "text-slate-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{m.label}</p>
                        {!cash && (
                          <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">Electrónico</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{isUSD ? "🇺🇸 Dólares" : "🇺🇾 Pesos"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{isUSD ? fmtUSD(m.total) : fmtUYU(m.total)}</p>
                    {isUSD && m.uyu_equivalent > 0 && <p className="text-xs text-slate-400">≈ {fmtUYU(m.uyu_equivalent)}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: cash count with movements */}
          <div className="border-t-2 border-slate-200 bg-green-50 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" />Efectivo en caja (conteo físico)
            </p>
            {cashUYU > 0 || pettyCashUYU > 0 || ingresoUYU > 0 || egresoUYU > 0 ? (
              <>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Efectivo UYU recaudado</span><span>{fmtUYU(cashUYU)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Fondo fijo UYU</span><span>{fmtUYU(pettyCashUYU)}</span>
                </div>
                {ingresoUYU > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>+ Ingresos manuales UYU</span><span>+{fmtUYU(ingresoUYU)}</span>
                  </div>
                )}
                {egresoUYU > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-medium">
                    <span>- Egresos manuales UYU</span><span>-{fmtUYU(egresoUYU)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-800 pt-1 border-t border-green-200">
                  <span>Total esperado en caja UYU</span><span>{fmtUYU(expectedCashUYU)}</span>
                </div>
              </>
            ) : null}
            {cashUSD > 0 || pettyCashUSD > 0 || ingresoUSD > 0 || egresoUSD > 0 ? (
              <>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Efectivo USD recaudado</span><span>{fmtUSD(cashUSD)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Fondo fijo USD</span><span>{fmtUSD(pettyCashUSD)}</span>
                </div>
                {ingresoUSD > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>+ Ingresos manuales USD</span><span>+{fmtUSD(ingresoUSD)}</span>
                  </div>
                )}
                {egresoUSD > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-medium">
                    <span>- Egresos manuales USD</span><span>-{fmtUSD(egresoUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-800 pt-1 border-t border-green-200">
                  <span>Total esperado en caja USD</span><span>{fmtUSD(expectedCashUSD)}</span>
                </div>
              </>
            ) : null}
            {cashUYU === 0 && cashUSD === 0 && pettyCashUYU === 0 && pettyCashUSD === 0 && ingresoUYU === 0 && egresoUYU === 0 && ingresoUSD === 0 && egresoUSD === 0 && (
              <p className="text-xs text-slate-400 italic">Sin movimientos de efectivo hoy</p>
            )}
            {!isOpen && (
              <div className="pt-1 border-t border-green-200 space-y-1">
                {(cashUYU > 0 || pettyCashUYU > 0 || ingresoUYU > 0 || egresoUYU > 0) && (
                  <div className={`flex justify-between text-xs font-bold ${diffUYU >= 0 ? "text-green-700" : "text-red-600"}`}>
                    <span className="flex items-center gap-1">
                      {diffUYU > 0 ? <TrendingUp className="h-3 w-3" /> : diffUYU < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      Diferencia UYU
                    </span>
                    <span>{diffUYU >= 0 ? "+" : ""}{fmtUYU(diffUYU)}</span>
                  </div>
                )}
                {(cashUSD > 0 || pettyCashUSD > 0 || ingresoUSD > 0 || egresoUSD > 0) && (
                  <div className={`flex justify-between text-xs font-bold ${diffUSD >= 0 ? "text-green-700" : "text-red-600"}`}>
                    <span className="flex items-center gap-1">
                      {diffUSD > 0 ? <TrendingUp className="h-3 w-3" /> : diffUSD < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      Diferencia USD
                    </span>
                    <span>{diffUSD >= 0 ? "+" : ""}{fmtUSD(diffUSD)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Concept breakdown */}
      {totalServicios > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Desglose por concepto</p>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100">
                  <Wrench className="h-3.5 w-3.5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Mano de obra</p>
                  <p className="text-xs text-slate-400">Servicios realizados</p>
                </div>
              </div>
              <p className="font-bold text-slate-800">{fmtUYU(totalManoDeObra)}</p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                  <Package className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Insumos / Repuestos</p>
                  <p className="text-xs text-slate-400">Productos utilizados</p>
                </div>
              </div>
              <p className="font-bold text-slate-800">{fmtUYU(totalInsumos)}</p>
            </div>
          </div>
          <div className="border-t-2 border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Total facturado en servicios</p>
            <p className="text-sm font-bold text-slate-800">{fmtUYU(totalServicios)}</p>
          </div>
        </div>
      )}

      {/* Combined movements list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">Movimientos ({combined.length})</h3>
          {combined.length > 0 && (
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir
            </Button>
          )}
        </div>
        {combined.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin movimientos registrados</p>
          </div>
        ) : (
          <div className="px-4 divide-y divide-slate-50">
            {combined.map(item =>
              item._kind === "payment"
                ? <PaymentRow key={item.id} payment={item} />
                : <MovementRow key={item.id} movement={item} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Close form ───────────────────────────────────────────────────────────────
function CloseForm({ register, payments, movements, onClose, onConfirm, saving }) {
  const methodList = buildMethodList(payments);
  const pettyCashUYU = Number(f(register, "petty_cash_uyu")) || 0;
  const pettyCashUSD = Number(f(register, "petty_cash_usd")) || 0;
  const regForCalc = { ...register, petty_cash_uyu: pettyCashUYU, petty_cash_usd: pettyCashUSD };
  const { cashUYU, cashUSD, ingresoUYU, egresoUYU, ingresoUSD, egresoUSD, expectedCashUYU, expectedCashUSD } = calcExpected(regForCalc, payments, movements);

  const [closingUYU, setClosingUYU] = useState(expectedCashUYU.toString());
  const [closingUSD, setClosingUSD] = useState(expectedCashUSD.toString());
  const [closingNotes, setClosingNotes] = useState("");

  const electronicMethods = methodList.filter(m => !isCash(m.type));
  const cashMethods = methodList.filter(m => isCash(m.type));

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Lock className="h-4 w-4 text-amber-500" />Cerrar Caja
      </h3>

      {/* Electronic methods — reference only */}
      {electronicMethods.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Métodos electrónicos (referencia)</p>
          </div>
          <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {electronicMethods.map(m => {
              const Icon = METHOD_ICONS[m.type] || Banknote;
              return (
                <div key={m.key} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">{m.label}</p>
                      <p className="text-xs text-slate-400">{m.currency === "USD" ? "🇺🇸 Dólares" : "🇺🇾 Pesos"} · No se cuenta</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-700 text-sm">{m.currency === "USD" ? fmtUSD(m.total) : fmtUYU(m.total)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cash — physical count */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="h-3.5 w-3.5 text-green-600" />
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Efectivo (conteo físico)</p>
        </div>
        <div className="bg-green-50 rounded-xl overflow-hidden border border-green-200">
          {cashMethods.length > 0 && (
            <div className="divide-y divide-green-100">
              {cashMethods.map(m => (
                <div key={m.key} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-3.5 w-3.5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{m.label}</p>
                      <p className="text-xs text-slate-400">{m.currency === "USD" ? "🇺🇸 Dólares" : "🇺🇾 Pesos"} · Recaudado</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{m.currency === "USD" ? fmtUSD(m.total) : fmtUYU(m.total)}</p>
                </div>
              ))}
            </div>
          )}
          <div className="px-3 py-2.5 border-t border-green-200 space-y-1 bg-green-50">
            {(cashUYU > 0 || pettyCashUYU > 0 || ingresoUYU > 0 || egresoUYU > 0) && (
              <>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Fondo fijo UYU</span><span>{fmtUYU(pettyCashUYU)}</span>
                </div>
                {ingresoUYU > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>+ Ingresos manuales UYU</span><span>+{fmtUYU(ingresoUYU)}</span>
                  </div>
                )}
                {egresoUYU > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-medium">
                    <span>- Egresos manuales UYU</span><span>-{fmtUYU(egresoUYU)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>Total esperado en caja UYU</span><span>{fmtUYU(expectedCashUYU)}</span>
                </div>
              </>
            )}
            {(cashUSD > 0 || pettyCashUSD > 0 || ingresoUSD > 0 || egresoUSD > 0) && (
              <>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Fondo fijo USD</span><span>{fmtUSD(pettyCashUSD)}</span>
                </div>
                {ingresoUSD > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>+ Ingresos manuales USD</span><span>+{fmtUSD(ingresoUSD)}</span>
                  </div>
                )}
                {egresoUSD > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-medium">
                    <span>- Egresos manuales USD</span><span>-{fmtUSD(egresoUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>Total esperado en caja USD</span><span>{fmtUSD(expectedCashUSD)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Physical count inputs */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="text-xs">🇺🇾 Efectivo contado UYU ($)</Label>
          <Input type="number" value={closingUYU} onChange={e => setClosingUYU(e.target.value)} className="mt-1" />
          {closingUYU !== "" && (
            <p className={`text-xs mt-1 font-medium ${(parseFloat(closingUYU) - expectedCashUYU) >= 0 ? "text-green-600" : "text-red-600"}`}>
              Diferencia: {(parseFloat(closingUYU) - expectedCashUYU) >= 0 ? "+" : ""}{fmtUYU(parseFloat(closingUYU) - expectedCashUYU)}
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs">🇺🇸 Efectivo contado USD (US$)</Label>
          <Input type="number" value={closingUSD} onChange={e => setClosingUSD(e.target.value)} className="mt-1" />
          {closingUSD !== "" && (
            <p className={`text-xs mt-1 font-medium ${(parseFloat(closingUSD) - expectedCashUSD) >= 0 ? "text-green-600" : "text-red-600"}`}>
              Diferencia: {(parseFloat(closingUSD) - expectedCashUSD) >= 0 ? "+" : ""}{fmtUSD(parseFloat(closingUSD) - expectedCashUSD)}
            </p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-xs">Notas de cierre</Label>
        <Textarea value={closingNotes} onChange={e => setClosingNotes(e.target.value)} rows={2} className="mt-1 text-sm" placeholder="Observaciones del cierre..." />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => onConfirm(parseFloat(closingUYU) || 0, parseFloat(closingUSD) || 0, closingNotes, expectedCashUYU, expectedCashUSD)}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600"
        >
          {saving ? "Cerrando..." : "Confirmar Cierre"}
        </Button>
      </div>
    </div>
  );
}

// ─── Movement form ────────────────────────────────────────────────────────────
function MovementForm({ onClose, onConfirm, saving }) {
  const [type, setType] = useState("egreso");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UYU");
  const [notes, setNotes] = useState("");

  const canSubmit = concept.trim() && parseFloat(amount) > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <ArrowUpRight className="h-4 w-4 text-slate-500" />Registrar Movimiento Manual
      </h3>

      {/* Tipo toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType("ingreso")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            type === "ingreso" ? "bg-green-500 text-white border-green-500" : "bg-white text-slate-600 border-slate-200 hover:border-green-300"
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />Ingreso
        </button>
        <button
          onClick={() => setType("egreso")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            type === "egreso" ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-600 border-slate-200 hover:border-red-300"
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />Egreso
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Concepto *</Label>
          <Input
            value={concept}
            onChange={e => setConcept(e.target.value)}
            className="mt-1"
            placeholder={type === "ingreso" ? "Ej: Cambio adicional, vuelto de compra..." : "Ej: Flete, repuesto urgente, limpieza..."}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Monto *</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Moneda</Label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setCurrency("UYU")}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${currency === "UYU" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}
              >🇺🇾 UYU</button>
              <button
                onClick={() => setCurrency("USD")}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${currency === "USD" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}
              >🇺🇸 USD</button>
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs">Notas (opcional)</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 text-sm" placeholder="Observaciones..." />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => onConfirm({ type, concept: concept.trim(), amount: parseFloat(amount), currency, notes })}
          disabled={saving || !canSubmit}
          className={type === "ingreso" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
        >
          {saving ? "Guardando..." : `Registrar ${type === "ingreso" ? "Ingreso" : "Egreso"}`}
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CashRegisterPage() {
  const { refresh: refreshContext, prevOpenRegister } = useCashRegister();
  const [todayRegisters, setTodayRegisters] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [allMovements, setAllMovements] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showOpenForm, setShowOpenForm] = useState(false);
  const [pettyCashUYU, setPettyCashUYU] = useState("0");
  const [pettyCashUSD, setPettyCashUSD] = useState("0");
  const [openingUYU, setOpeningUYU] = useState("0");
  const [openingUSD, setOpeningUSD] = useState("0");
  const [openingNotes, setOpeningNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [pinModal, setPinModal] = useState(null); // { title, onConfirm }
  const [printRegister, setPrintRegister] = useState(null);
  const [printPayments, setPrintPayments] = useState([]);
  const [printMovements, setPrintMovements] = useState([]);
  const [printOrders, setPrintOrders] = useState([]);

  const handlePrint = async (register, payments, movements = []) => {
    setPrintRegister(register);
    setPrintPayments(payments);
    setPrintMovements(movements);
    // Cargar órdenes vinculadas a estos pagos
    const orderIds = [...new Set(payments.map(p => p.service_order_id).filter(Boolean))];
    if (orderIds.length > 0) {
      try {
        const orders = await Promise.all(orderIds.map(id => ServiceOrder.get(id)));
        setPrintOrders(orders.filter(Boolean));
      } catch { setPrintOrders([]); }
    } else {
      setPrintOrders([]);
    }
    setTimeout(() => window.print(), 200);
  };

  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

  const loadData = async () => {
    setLoading(true);
    const [registers, payments, movements] = await Promise.all([
      CashRegister.list("-opened_at", 100),
      Payment.list("-paid_at", 500),
      CashMovement.list("-moved_at", 500),
    ]);
    const normalizeDate = (d) => d ? d.split("T")[0] : null;
    const todayRegs = registers
      .filter(r => normalizeDate(r.date) === today)
      .sort((a, b) => new Date(a.opened_at) - new Date(b.opened_at));
    setTodayRegisters(todayRegs);
    setAllPayments(payments);
    setAllMovements(movements);

    // Cargar órdenes vinculadas a los pagos de hoy
    const todayRegIds = new Set(todayRegs.map(r => r.id));
    const todayPayments = payments.filter(p => todayRegIds.has(p.cash_register_id));
    const orderIds = [...new Set(todayPayments.map(p => p.service_order_id).filter(Boolean))];
    if (orderIds.length > 0) {
      try {
        const orders = await Promise.all(orderIds.map(id => ServiceOrder.get(id)));
        setAllOrders(orders.filter(Boolean));
      } catch { setAllOrders([]); }
    } else {
      setAllOrders([]);
    }

    const hist = registers.filter(r => normalizeDate(r.date) !== today)
      .sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
    setHistory(hist);
    if (todayRegs.length === 0) {
      const lastClosed = registers.find(r => r.status === "closed");
      if (lastClosed) {
        setPettyCashUYU(String(f(lastClosed, "petty_cash_uyu") || 0));
        setPettyCashUSD(String(f(lastClosed, "petty_cash_usd") || 0));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    User.me().then(u => { if (u?.role === "admin") setIsAdmin(true); }).catch(() => {});
  }, []);

  // The "active" register for operations is always the open one
  const activeRegister = todayRegisters.find(r => r.status === "open") || null;
  const activePayments = activeRegister
    ? allPayments.filter(p => p.cash_register_id === activeRegister.id)
    : [];
  const activeMovements = activeRegister
    ? allMovements.filter(m => m.cash_register_id === activeRegister.id)
    : [];

  const handleOpenRegister = (cashierUser) => {
    setSaving(true);
    const pUYU = parseFloat(pettyCashUYU) || 0;
    const pUSD = parseFloat(pettyCashUSD) || 0;
    CashRegister.create({
      date: today, status: "open", opened_at: new Date().toISOString(),
      petty_cash_uyu: pUYU, petty_cash_usd: pUSD,
      opening_balance_uyu: pUYU,
      opening_balance_usd: pUSD,
      total_uyu: 0, total_usd: 0, notes: openingNotes,
      opened_by: cashierUser?.fullName || null,
    }).then(() => {
      setShowOpenForm(false); setOpeningNotes(""); setSaving(false);
      return loadData().then(refreshContext);
    });
  };

  const handleCloseRegister = async (closUYU, closUSD, closingNotes, expectedCashUYU, expectedCashUSD, cashierUser) => {
    if (!activeRegister) return;
    setSaving(true);
    const totalUYU = activePayments.filter(p => p.currency === "UYU").reduce((s, p) => s + Number(p.amount), 0);
    const totalUSD = activePayments.filter(p => p.currency === "USD").reduce((s, p) => s + Number(p.amount), 0);
    await CashRegister.update(activeRegister.id, {
      status: "closed",
      closed_at: new Date().toISOString(),
      closing_balance_uyu: closUYU,
      closing_balance_usd: closUSD,
      difference_uyu: closUYU - expectedCashUYU,
      difference_usd: closUSD - expectedCashUSD,
      total_uyu: totalUYU,
      total_usd: totalUSD,
      notes: closingNotes,
      closed_by: cashierUser.fullName,
    });
    setShowCloseForm(false); setSaving(false);
    await loadData();
    refreshContext();
  };

  const handleSaveMovement = async ({ type, concept, amount, currency, notes }, cashierUser) => {
    if (!activeRegister) return;
    setSaving(true);
    await CashMovement.create({
      cash_register_id: activeRegister.id,
      type,
      concept,
      amount,
      currency,
      moved_at: new Date().toISOString(),
      notes,
      created_by: cashierUser.fullName,
    });
    setShowMovementForm(false);
    setSaving(false);
    await loadData();
  };

  const requestPin = (title, onConfirm) => setPinModal({ title, onConfirm });

  const handleDeleteRegister = async (registerId) => {
    await CashRegister.delete(registerId);
    await loadData();
    refreshContext();
  };

  const handleForceCloseHistory = async (reg, expectedCashUYU, expectedCashUSD, notes) => {
    await CashRegister.update(reg.id, {
      status: "closed",
      closed_at: new Date().toISOString(),
      closing_balance_uyu: expectedCashUYU,
      closing_balance_usd: expectedCashUSD,
      difference_uyu: 0,
      difference_usd: 0,
      notes: notes || "Cierre manual desde historial",
    });
    await loadData();
    refreshContext();
  };

  const openNewCaja = () => {
    const lastReg = todayRegisters[todayRegisters.length - 1];
    if (lastReg) { setPettyCashUYU(String(f(lastReg, "petty_cash_uyu") || 0)); setPettyCashUSD(String(f(lastReg, "petty_cash_usd") || 0)); }
    setOpeningUYU("0"); setOpeningUSD("0"); setOpeningNotes("");
    setShowOpenForm(true); setShowCloseForm(false); setShowMovementForm(false);
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;

  const openRegister = todayRegisters.find(r => r.status === "open") || null;
  const closedToday = todayRegisters.filter(r => r.status !== "open");
  const openPayments = openRegister ? allPayments.filter(p => p.cash_register_id === openRegister.id) : [];
  const openMovements = openRegister ? allMovements.filter(m => m.cash_register_id === openRegister.id) : [];
  const openOrderIds = new Set(openPayments.map(p => p.service_order_id).filter(Boolean));
  const openOrders = allOrders.filter(o => openOrderIds.has(o.id));

  return (
    <>
      {pinModal && (
        <PinModal
          title={pinModal.title}
          onConfirm={pinModal.onConfirm}
          onClose={() => setPinModal(null)}
        />
      )}
      {(printRegister || openRegister) && (
        <PrintView
          register={printRegister || openRegister}
          payments={printRegister ? printPayments : openPayments}
          movements={printRegister ? printMovements : openMovements}
          orders={printRegister ? printOrders : allOrders.filter(o => openOrderIds?.has?.(o.id))}
        />
      )}

      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Caja</h1>
            <p className="text-sm text-slate-500 capitalize">{fmtDate(today)}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!openRegister && !showOpenForm && !prevOpenRegister && (
              <Button onClick={todayRegisters.length > 0 ? openNewCaja : () => setShowOpenForm(true)}>
                <Plus className="h-4 w-4 mr-2" />{todayRegisters.length > 0 ? "Nueva Caja" : "Abrir Caja"}
              </Button>
            )}
            {openRegister && !showMovementForm && (
              <Button
                variant="outline"
                onClick={() => { setShowMovementForm(true); setShowCloseForm(false); setShowOpenForm(false); }}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />Movimiento
              </Button>
            )}
            {openRegister && !showCloseForm && (
              <Button variant="outline" onClick={() => { setShowCloseForm(true); setShowOpenForm(false); setShowMovementForm(false); }}>
                <Lock className="h-4 w-4 mr-2" />Cerrar Caja
              </Button>
            )}
          </div>
        </div>

        {/* Bloqueo: caja de dia anterior sin cerrar */}
        {prevOpenRegister && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Hay una caja sin cerrar del {prevOpenRegister.date ? fmtDate(prevOpenRegister.date) : "día anterior"}</p>
              <p className="text-red-600 text-xs mt-0.5">Cerrá esa caja antes de abrir una nueva para hoy. Expandila en el historial para cerrarla.</p>
            </div>
          </div>
        )}

        {/* Open form */}
        {showOpenForm && !prevOpenRegister && (
          <div className="bg-white rounded-xl border border-orange-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-500" />
              {todayRegisters.length === 0 ? "Abrir Caja del Día" : `Abrir Caja ${todayRegisters.length + 1} del Día`}
            </h3>
            {todayRegisters.length > 0 && <p className="text-xs text-slate-400 mb-4">Ya hay {todayRegisters.length} caja(s) cerrada(s) hoy</p>}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fondo Fijo de Efectivo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">🇺🇾 Fondo fijo UYU ($)</Label>
                    <Input type="number" value={pettyCashUYU} onChange={e => setPettyCashUYU(e.target.value)} className="mt-1" placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs">🇺🇸 Fondo fijo USD (US$)</Label>
                    <Input type="number" value={pettyCashUSD} onChange={e => setPettyCashUSD(e.target.value)} className="mt-1" placeholder="0" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notas de apertura</Label>
                <Textarea value={openingNotes} onChange={e => setOpeningNotes(e.target.value)} rows={2} className="mt-1 text-sm" placeholder="Observaciones..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowOpenForm(false)}>Cancelar</Button>
                <Button
                  onClick={() => handleOpenRegister(null)}
                  disabled={saving}
                >{saving ? "Abriendo..." : "Abrir Caja"}</Button>
              </div>
            </div>
          </div>
        )}

        {/* Movement form */}
        {showMovementForm && openRegister && (
          <MovementForm
            onClose={() => setShowMovementForm(false)}
            onConfirm={(data) => handleSaveMovement(data, { fullName: null })}
            saving={saving}
          />
        )}

        {/* Close form */}
        {showCloseForm && openRegister && (
          <CloseForm
            register={openRegister}
            payments={openPayments}
            movements={openMovements}
            onClose={() => setShowCloseForm(false)}
            onConfirm={(closUYU, closUSD, closingNotes, expectedUYU, expectedUSD) =>
              handleCloseRegister(closUYU, closUSD, closingNotes, expectedUYU, expectedUSD, { fullName: null })
            }
            saving={saving}
          />
        )}

        {/* No register open — empty state */}
        {!openRegister && todayRegisters.length === 0 && !showOpenForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-sm">
            <Wallet className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No hay caja abierta para hoy</p>
            <p className="text-sm text-slate-400 mt-1">Abrí la caja para registrar pagos del día</p>
            {!prevOpenRegister && (
              <Button className="mt-4" onClick={() => setShowOpenForm(true)}><Plus className="h-4 w-4 mr-2" />Abrir Caja</Button>
            )}
          </div>
        )}

        {/* Open register — prominent, full detail */}
        {openRegister && (
          <TodayRegisterView
            register={openRegister}
            payments={openPayments}
            movements={openMovements}
            orders={openOrders}
            onPrint={() => handlePrint(openRegister, openPayments, openMovements)}
          />
        )}

        {/* No open register but there are closed ones today — show message */}
        {!openRegister && closedToday.length > 0 && !showOpenForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 font-medium text-sm">Todas las cajas de hoy están cerradas</p>
            {!prevOpenRegister && (
              <Button className="mt-3" size="sm" onClick={openNewCaja}><Plus className="h-4 w-4 mr-2" />Abrir nueva caja</Button>
            )}
          </div>
        )}

        {/* Closed registers from today — compact collapsible */}
        {closedToday.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-slate-400" />Cajas cerradas hoy ({closedToday.length})
            </h2>
            {closedToday.map(reg => (
              <HistoryCard key={reg.id} register={reg} onPrint={handlePrint} onCloseRegister={handleForceCloseHistory} isAdmin={isAdmin} onDelete={handleDeleteRegister} />
            ))}
          </div>
        )}

        {/* History — previous days */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />Historial de Cajas
            </h2>
            {history.map(reg => <HistoryCard key={reg.id} register={reg} onPrint={handlePrint} onCloseRegister={handleForceCloseHistory} isAdmin={isAdmin} onDelete={handleDeleteRegister} />)}
          </div>
        )}
      </div>
    </>
  );
}
