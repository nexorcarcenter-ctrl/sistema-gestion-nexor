import { useState, useEffect } from "react";
import { Payment } from "@/entities/Payment";
import { CashRegister } from "@/entities/CashRegister";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { PaymentMethod } from "@/entities/PaymentMethod";
import { Sale } from "@/entities/Sale";
import { getSequence } from "@/entities/base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Banknote, CreditCard, ArrowLeftRight, AlertCircle, FileCheck, MoreHorizontal, Plus, X } from "lucide-react";

const TYPE_ICONS = {
  cash:           Banknote,
  card_credit:    CreditCard,
  card_debit:     CreditCard,
  card:           CreditCard,
  transfer:       ArrowLeftRight,
  mercado_pago:   MoreHorizontal,
  check:          FileCheck,
  other:          MoreHorizontal,
};

const DEFAULT_METHODS = [
  { id: "card_credit_uyu", name: "Tarjeta Crédito",   currency: "UYU", type: "card_credit" },
  { id: "card_debit_uyu",  name: "Tarjeta Débito",    currency: "UYU", type: "card_debit" },
  { id: "cash_uyu",        name: "Efectivo",           currency: "UYU", type: "cash" },
  { id: "mercado_pago_uyu",name: "Mercado Pago",       currency: "UYU", type: "mercado_pago" },
  { id: "transfer_uyu",    name: "Transferencia",      currency: "UYU", type: "transfer" },
  { id: "cash_usd",        name: "Efectivo USD",       currency: "USD", type: "cash" },
  { id: "transfer_usd",    name: "Transferencia USD",  currency: "USD", type: "transfer" },
];

const fmt = (n, currency = "UYU") =>
  currency === "USD"
    ? `US$ ${Number(n || 0).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$ ${Number(n || 0).toLocaleString("es-UY", { minimumFractionDigits: 0 })}`;

export default function PaymentDialog({ open, onClose, order, onPaymentSaved }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("40");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [cashRegister, setCashRegister] = useState(null);
  const [noCashRegister, setNoCashRegister] = useState(false);
  // Split payment entries
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setExchangeRate("40");
    setNotes("");
    setSelectedMethod(null);
    setEntries([]);

    const _now = new Date();
    const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

    Promise.all([
      PaymentMethod.filter({ is_active: true }, "sort_order", 50),
      CashRegister.filter({ status: "open" }, "-opened_at", 20),
    ]).then(([methods, registers]) => {
      const activeMethods = methods.length > 0 ? methods : DEFAULT_METHODS;
      setPaymentMethods(activeMethods);
      setSelectedMethod(activeMethods[0] || null);

      const todayRegister = registers.find(r => (r.date || "").split("T")[0] === today);
      if (todayRegister) {
        setCashRegister(todayRegister);
        setNoCashRegister(false);
      } else {
        setCashRegister(null);
        setNoCashRegister(true);
      }
    });
  }, [open]);

  if (!order) return null;

  const totalSale = Number(order.total_sale) || 0;
  const alreadyPaid = Number(order.paid_amount) || 0;
  const remaining = totalSale - alreadyPaid;

  const currency = selectedMethod?.currency || "UYU";
  const amountNum = parseFloat(amount) || 0;
  const exchangeRateNum = parseFloat(exchangeRate) || 1;
  const amountUYU = currency === "USD" ? amountNum * exchangeRateNum : amountNum;

  // Total from entries already added
  const entriesTotal = entries.reduce((s, e) => s + e.amountUYU, 0);
  const stillRemaining = remaining - entriesTotal;

  const addEntry = () => {
    if (!amountNum || amountNum <= 0 || !selectedMethod) return;
    setEntries(prev => [...prev, {
      method: selectedMethod,
      amount: amountNum,
      currency,
      exchangeRate: currency === "USD" ? exchangeRateNum : 1,
      amountUYU,
    }]);
    setAmount("");
  };

  const removeEntry = (idx) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    // If there's a pending amount in the input, add it first
    const finalEntries = [...entries];
    if (amountNum > 0 && selectedMethod) {
      finalEntries.push({
        method: selectedMethod,
        amount: amountNum,
        currency,
        exchangeRate: currency === "USD" ? exchangeRateNum : 1,
        amountUYU,
      });
    }
    if (finalEntries.length === 0) return;

    setSaving(true);

    const totalPayingUYU = finalEntries.reduce((s, e) => s + e.amountUYU, 0);

    // 1. Create Payment records for each entry
    for (const entry of finalEntries) {
      await Payment.create({
        service_order_id: order.id,
        order_number: order.order_number || "",
        cash_register_id: cashRegister?.id || "",
        customer_name: order.customer_name || "",
        car_plate: order.car_plate || "",
        amount: entry.amount,
        currency: entry.currency,
        payment_method: entry.method.type || "cash",
        exchange_rate: entry.exchangeRate,
        amount_uyu_equivalent: entry.amountUYU,
        paid_at: new Date().toISOString(),
        notes,
      });
    }

    // 2. Update ServiceOrder payment status
    const newPaidAmount = alreadyPaid + totalPayingUYU;
    let paymentStatus = "partial";
    if (newPaidAmount >= totalSale) paymentStatus = "paid";
    if (newPaidAmount <= 0) paymentStatus = "unpaid";

    await ServiceOrder.update(order.id, {
      paid_amount: newPaidAmount,
      payment_status: paymentStatus,
    });

    // 3. Create or update Sale
    const existingSales = order.sale_id
      ? await Sale.filter({ service_order_id: order.id }, "-createdAt", 1)
      : [];

    const services = JSON.parse(order.services || "[]");
    const saleItems = services.flatMap(svc => {
      const items = [];
      if (svc.sale_price > 0) {
        items.push({
          product_id: svc.service_type_id || "",
          product_name: svc.service_name,
          quantity: 1,
          unit_price: svc.sale_price,
          total: svc.sale_price,
        });
      }
      (svc.products || []).forEach(p => {
        items.push({
          product_id: p.product_id || "",
          product_name: p.product_name,
          quantity: p.quantity || 1,
          unit_price: p.cost_price || 0,
          total: (p.cost_price || 0) * (p.quantity || 1),
        });
      });
      return items;
    });

    const vehicle = [order.car_plate, order.car_brand, order.car_model].filter(Boolean).join(" · ");

    const paymentsJsonEntries = finalEntries.map(e => ({
      method_id: e.method.id,
      method_name: e.method.name,
      type: e.method.type,
      amount: e.amount,
      currency: e.currency,
      amount_uyu: e.amountUYU,
      exchange_rate: e.exchangeRate,
    }));

    const totalUSD = finalEntries.filter(e => e.currency === "USD").reduce((s, e) => s + e.amount, 0);

    if (existingSales.length > 0) {
      const existingSale = existingSales[0];
      const existingPayments = JSON.parse(existingSale.payments_json || "[]");
      const allPayments = [...existingPayments, ...paymentsJsonEntries];
      const newTotalUSD = (Number(existingSale.total_usd) || 0) + totalUSD;
      const newTotalUYU = (Number(existingSale.total_uyu) || 0) + totalPayingUYU;

      await Sale.update(existingSale.id, {
        payments_json: JSON.stringify(allPayments),
        total_uyu: newTotalUYU,
        total_usd: newTotalUSD,
        total: newTotalUYU,
        payment_status: paymentStatus === "paid" ? "paid" : "partial",
        cash_register_id: cashRegister?.id || existingSale.cash_register_id || "",
      });
    } else {
      const saleNumber = await getSequence("sale");
      const newSale = await Sale.create({
        sale_number: saleNumber,
        sale_date: new Date().toISOString(),
        sale_type: "with_service",
        service_order_id: order.id,
        service_order_number: order.order_number || "",
        customer_name: order.customer_name || "",
        customer_phone: order.customer_phone || "",
        vehicle,
        items_json: JSON.stringify(saleItems),
        items_count: saleItems.length,
        payments_json: JSON.stringify(paymentsJsonEntries),
        total_uyu: totalPayingUYU,
        total_usd: totalUSD,
        total: totalPayingUYU,
        subtotal: totalSale,
        payment_status: paymentStatus === "paid" ? "paid" : "partial",
        status: "completed",
        cash_register_id: cashRegister?.id || "",
        notes,
      });

      await ServiceOrder.update(order.id, {
        sale_id: newSale.id,
        sale_number: saleNumber,
      });
    }

    // 4. Update CashRegister totals
    if (cashRegister) {
      let addUYU = 0;
      let addUSD = 0;
      for (const e of finalEntries) {
        if (e.currency === "USD") {
          addUSD += e.amount;
          addUYU += e.amountUYU;
        } else {
          addUYU += e.amount;
        }
      }
      const updatedTotals = {};
      if (addUYU > 0) updatedTotals.total_uyu = (Number(cashRegister.total_uyu) || 0) + addUYU;
      if (addUSD > 0) updatedTotals.total_usd = (Number(cashRegister.total_usd) || 0) + addUSD;
      if (Object.keys(updatedTotals).length > 0) {
        await CashRegister.update(cashRegister.id, updatedTotals);
      }
    }

    setSaving(false);
    onPaymentSaved && onPaymentSaved({ ...order, paid_amount: newPaidAmount, payment_status: paymentStatus });
    onClose();
  };

  const uyuMethods = paymentMethods.filter(m => m.currency === "UYU");
  const usdMethods = paymentMethods.filter(m => m.currency === "USD");

  const canAdd = amountNum > 0 && selectedMethod;
  const canSave = (entries.length > 0 || canAdd) && !noCashRegister;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#E8461E]" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>

        {/* Order summary */}
        <div className="bg-slate-50 rounded-xl p-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Orden</span>
            <span className="font-semibold text-slate-800">{order.car_plate} — {order.customer_name}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-500">Total orden</span>
            <span className="font-bold text-slate-800">{fmt(totalSale)}</span>
          </div>
          {alreadyPaid > 0 && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-slate-500">Ya pagado</span>
              <span className="text-green-600 font-medium">{fmt(alreadyPaid)}</span>
            </div>
          )}
          <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-200">
            <span className="text-slate-600 font-medium">Saldo pendiente</span>
            <span className="font-bold text-[#c73a15] text-base">{fmt(stillRemaining > 0 ? stillRemaining : remaining)}</span>
          </div>
        </div>

        {noCashRegister && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">No hay caja abierta hoy</p>
              <p className="text-xs mt-0.5">Abrí la caja antes de registrar un pago.</p>
              <a href="/cash-register" className="text-xs underline font-medium mt-1 inline-block hover:text-red-900">Ir a Caja →</a>
            </div>
          </div>
        )}

        {/* Entries already added */}
        {entries.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Pagos agregados</Label>
            {entries.map((e, i) => {
              const Icon = TYPE_ICONS[e.method.type] || Banknote;
              return (
                <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-800">{e.method.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-green-700">{fmt(e.amount, e.currency)}</span>
                    <button onClick={() => removeEntry(i)} className="w-5 h-5 rounded-full bg-green-200 hover:bg-red-200 text-green-700 hover:text-red-600 flex items-center justify-center transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500">Subtotal agregado</span>
              <span className="font-bold text-green-600">{fmt(entriesTotal)}</span>
            </div>
            {stillRemaining > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Resta cubrir</span>
                <span className="font-bold text-[#E8461E]">{fmt(stillRemaining)}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* UYU methods */}
          {uyuMethods.length > 0 && (
            <div>
              <Label className="text-xs mb-2 block">🇺🇾 Pesos Uruguayos</Label>
              <div className="grid grid-cols-3 gap-2">
                {uyuMethods.map(m => {
                  const Icon = TYPE_ICONS[m.type] || Banknote;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                        selectedMethod?.id === m.id
                          ? "border-[#E8461E] bg-[#E8461E]/5 text-[#c73a15]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-center leading-tight">{m.name.replace(" UYU", "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* USD methods */}
          {usdMethods.length > 0 && (
            <div>
              <Label className="text-xs mb-2 block">🇺🇸 Dólares</Label>
              <div className="grid grid-cols-3 gap-2">
                {usdMethods.map(m => {
                  const Icon = TYPE_ICONS[m.type] || Banknote;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                        selectedMethod?.id === m.id
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-center leading-tight">{m.name.replace(" USD", "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amount + Add button */}
          {selectedMethod && (
            <div>
              <Label className="text-xs">
                Monto ({currency === "USD" ? "US$" : "$"}) — {selectedMethod.name}
              </Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-medium">
                    {currency === "USD" ? "US$" : "$"}
                  </span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="pl-10"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter" && canAdd) addEntry(); }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addEntry}
                  disabled={!canAdd}
                  className="shrink-0 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700"
                  title="Agregar otro medio de pago"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <button
                className="text-xs text-[#E8461E] mt-1 hover:underline"
                onClick={() => {
                  const rem = stillRemaining > 0 ? stillRemaining : remaining;
                  setAmount(currency === "USD" ? (rem / exchangeRateNum).toFixed(2) : rem.toString());
                }}
              >
                Usar saldo pendiente ({fmt(stillRemaining > 0 ? stillRemaining : remaining, currency)})
              </button>
            </div>
          )}

          {/* Exchange rate for USD */}
          {currency === "USD" && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
              <Label className="text-xs text-blue-700">Tipo de cambio (1 USD = ? UYU)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={exchangeRate}
                  onChange={e => setExchangeRate(e.target.value)}
                  className="w-28 h-8 text-sm"
                />
                <span className="text-xs text-slate-500">UYU</span>
              </div>
              {amountNum > 0 && (
                <p className="text-xs text-blue-700 font-medium">
                  Equivale a {fmt(amountUYU)} UYU
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones del pago..."
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? "Guardando..." : `Registrar ${fmt(entriesTotal + amountUYU)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
