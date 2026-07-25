import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sale } from "@/entities/Sale";
import { Product } from "@/entities/Product";
import { PaymentMethod } from "@/entities/PaymentMethod";
import { CashRegister } from "@/entities/CashRegister";
import { StockMovement } from "@/entities/StockMovement";
import { getSequence } from "@/entities/base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Search, Plus, Trash2, ShoppingCart,
  User, Car, Banknote, CreditCard, ArrowLeftRight,
  FileCheck, MoreHorizontal, AlertCircle, Check
} from "lucide-react";

const TYPE_ICONS = {
  cash: Banknote, card: CreditCard, transfer: ArrowLeftRight,
  check: FileCheck, other: MoreHorizontal,
};

const fmtUYU = (n) => `$${Number(n || 0).toLocaleString("es-UY", { minimumFractionDigits: 0 })}`;
const fmtUSD = (n) => `US$${Number(n || 0).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function NewSale() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashRegister, setCashRegister] = useState(null);

  const [productSearch, setProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");

  // Payments: array of { method_id, method_name, type, currency, amount, exchange_rate }
  const [payments, setPayments] = useState([]);
  const [exchangeRate, setExchangeRate] = useState("40");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const _n = new Date();
    const today = `${_n.getFullYear()}-${String(_n.getMonth() + 1).padStart(2, "0")}-${String(_n.getDate()).padStart(2, "0")}`;
    Promise.all([
      Product.filter({ is_active: true }, "name", 200),
      PaymentMethod.filter({ is_active: true }, "sort_order", 50),
      CashRegister.filter({ status: "open" }, "-opened_at", 20),
    ]).then(([prods, methods, registers]) => {
      setProducts(prods);
      setPaymentMethods(methods.length > 0 ? methods : [
        { id: "cash_uyu", name: "Efectivo UYU", currency: "UYU", type: "cash" },
        { id: "card_uyu", name: "Tarjeta", currency: "UYU", type: "card" },
        { id: "transfer_uyu", name: "Transferencia UYU", currency: "UYU", type: "transfer" },
        { id: "cash_usd", name: "Efectivo USD", currency: "USD", type: "cash" },
      ]);
      const todayReg = registers.find(r => (r.date || "").split("T")[0] === today);
      if (todayReg) setCashRegister(todayReg);
    });
  }, []);

  const filteredProducts = products.filter(p =>
    !productSearch ||
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 10);

  const addProduct = (product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price }
          : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.unit_price || 0,
        total: product.unit_price || 0,
      }];
    });
    setProductSearch("");
    setShowProductSearch(false);
  };

  const updateQty = (idx, qty) => {
    if (qty <= 0) {
      setCartItems(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    setCartItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, quantity: qty, total: qty * item.unit_price } : item
    ));
  };

  const updatePrice = (idx, price) => {
    setCartItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, unit_price: price, total: item.quantity * price } : item
    ));
  };

  const addFreeItem = () => {
    setCartItems(prev => [...prev, {
      product_id: "",
      product_name: "",
      sku: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
    }]);
  };

  const subtotal = cartItems.reduce((s, i) => s + (i.total || 0), 0);

  // Payment helpers
  const getPaymentAmount = (methodId) => {
    const p = payments.find(p => p.method_id === methodId);
    return p ? p.amount : "";
  };

  const setPaymentAmount = (method, value) => {
    const amt = parseFloat(value) || 0;
    setPayments(prev => {
      const existing = prev.find(p => p.method_id === method.id);
      if (amt <= 0) return prev.filter(p => p.method_id !== method.id);
      if (existing) return prev.map(p => p.method_id === method.id ? { ...p, amount: amt } : p);
      return [...prev, {
        method_id: method.id,
        method_name: method.name,
        type: method.type,
        currency: method.currency,
        amount: amt,
        exchange_rate: method.currency === "USD" ? parseFloat(exchangeRate) || 40 : 1,
      }];
    });
  };

  const totalPaidUYU = payments.reduce((s, p) => {
    const rate = p.currency === "USD" ? (parseFloat(exchangeRate) || 40) : 1;
    return s + p.amount * rate;
  }, 0);

  const totalUSD = payments.filter(p => p.currency === "USD").reduce((s, p) => s + p.amount, 0);
  const change = totalPaidUYU - subtotal;

  const canSave = cartItems.length > 0 && cartItems.every(i => i.product_name && i.unit_price >= 0) && totalPaidUYU >= subtotal && !!cashRegister;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const saleNumber = await getSequence("sale");
    const paymentsJson = payments.map(p => ({
      ...p,
      amount_uyu: p.currency === "USD" ? p.amount * (parseFloat(exchangeRate) || 40) : p.amount,
      exchange_rate: p.currency === "USD" ? parseFloat(exchangeRate) || 40 : 1,
    }));

    await Sale.create({
      sale_number: saleNumber,
      sale_date: new Date().toISOString(),
      sale_type: "direct",
      customer_name: customerName || "",
      customer_phone: customerPhone || "",
      vehicle: vehicle || "",
      items_json: JSON.stringify(cartItems),
      items_count: cartItems.length,
      payments_json: JSON.stringify(paymentsJson),
      total_uyu: totalPaidUYU,
      total_usd: totalUSD,
      total: subtotal,
      subtotal,
      payment_status: "paid",
      status: "completed",
      cash_register_id: cashRegister?.id || "",
      notes,
    });

    // Update stock for each product (atomic server-side)
    const stockMovements = cartItems
      .filter(item => item.product_id)
      .map(item => ({
        product_id: item.product_id,
        movement_type: "sale",
        quantity: -item.quantity,
        reference_type: "sale",
        reference_number: saleNumber,
        reason: "Venta directa",
      }));
    if (stockMovements.length > 0) {
      await StockMovement.moveBulk(stockMovements);
    }

    // Update cash register
    if (cashRegister) {
      const uyuTotal = payments.filter(p => p.currency === "UYU").reduce((s, p) => s + p.amount, 0);
      const usdTotal = payments.filter(p => p.currency === "USD").reduce((s, p) => s + p.amount, 0);
      const usdInUYU = usdTotal * (parseFloat(exchangeRate) || 40);
      await CashRegister.update(cashRegister.id, {
        total_uyu: (cashRegister.total_uyu || 0) + uyuTotal + usdInUYU,
        total_usd: (cashRegister.total_usd || 0) + usdTotal,
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate(createPageUrl("Sales")), 1200);
  };

  const uyuMethods = paymentMethods.filter(m => m.currency === "UYU");
  const usdMethods = paymentMethods.filter(m => m.currency === "USD");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Sales"))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nueva Venta Directa</h1>
          <p className="text-sm text-slate-500">Venta sin orden de servicio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Products + Customer */}
        <div className="lg:col-span-2 space-y-4">

          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[#E8461E]" />Cliente y Vehículo <span className="text-xs text-slate-400 font-normal">(opcional)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre del cliente</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ej: Juan García" className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej: 099 123 456" className="mt-1 h-9" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs flex items-center gap-1"><Car className="h-3 w-3" />Vehículo</Label>
                <Input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Ej: ABC 1234 · Toyota Hilux" className="mt-1 h-9" />
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[#E8461E]" />Productos
              </h3>
              <Button size="sm" variant="outline" onClick={addFreeItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />Ítem libre
              </Button>
            </div>

            {/* Product search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar producto del catálogo..."
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductSearch(true); }}
                onFocus={() => setShowProductSearch(true)}
                className="pl-9 h-9"
              />
              {showProductSearch && productSearch && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-3">Sin resultados</p>
                  ) : filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full text-left px-3 py-2 hover:bg-[#E8461E]/5 flex items-center justify-between text-sm border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.sku} · Stock: {p.stock_quantity}</p>
                      </div>
                      <span className="font-bold text-[#c73a15]">{fmtUYU(p.unit_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            {cartItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Agregá productos para comenzar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      {item.product_id ? (
                        <p className="text-sm font-medium text-slate-800 truncate">{item.product_name}</p>
                      ) : (
                        <Input
                          value={item.product_name}
                          onChange={e => setCartItems(prev => prev.map((it, i) => i === idx ? { ...it, product_name: e.target.value } : it))}
                          placeholder="Descripción del ítem"
                          className="h-7 text-sm"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQty(idx, parseInt(e.target.value) || 0)}
                        className="w-14 h-7 text-sm text-center"
                        min={1}
                      />
                      <span className="text-slate-400 text-xs">×</span>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updatePrice(idx, parseFloat(e.target.value) || 0)}
                        className="w-24 h-7 text-sm text-right"
                      />
                      <span className="text-sm font-bold text-slate-700 w-20 text-right">{fmtUYU(item.total)}</span>
                      <button onClick={() => setCartItems(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Subtotal</p>
                    <p className="text-xl font-bold text-slate-800">{fmtUYU(subtotal)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones de la venta..." rows={2} className="mt-1 text-sm" />
          </div>
        </div>

        {/* Right: Payment */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-[#E8461E]" />Cobro
            </h3>

            {/* UYU */}
            {uyuMethods.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-2">🇺🇾 Pesos Uruguayos</p>
                <div className="space-y-2">
                  {uyuMethods.map(m => {
                    const Icon = TYPE_ICONS[m.type] || Banknote;
                    return (
                      <div key={m.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 w-28 shrink-0">
                          <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-600 truncate">{m.name.replace(" UYU", "")}</span>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                          <Input
                            type="number"
                            value={getPaymentAmount(m.id)}
                            onChange={e => setPaymentAmount(m, e.target.value)}
                            className="pl-5 h-7 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* USD */}
            {usdMethods.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-1">🇺🇸 Dólares</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500 w-28 shrink-0">Tipo de cambio</span>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={exchangeRate}
                      onChange={e => setExchangeRate(e.target.value)}
                      className="h-7 text-sm"
                      placeholder="40"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {usdMethods.map(m => {
                    const Icon = TYPE_ICONS[m.type] || Banknote;
                    return (
                      <div key={m.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 w-28 shrink-0">
                          <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-600 truncate">{m.name.replace(" USD", "")}</span>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">US$</span>
                          <Input
                            type="number"
                            value={getPaymentAmount(m.id)}
                            onChange={e => setPaymentAmount(m, e.target.value)}
                            className="pl-8 h-7 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total venta</span>
                <span className="font-bold text-slate-800">{fmtUYU(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total cobrado</span>
                <span className="font-bold text-[#c73a15]">{fmtUYU(totalPaidUYU)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Vuelto</span>
                  <span className="font-bold text-amber-600">{fmtUYU(change)}</span>
                </div>
              )}
              {totalPaidUYU < subtotal && totalPaidUYU > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Falta cobrar {fmtUYU(subtotal - totalPaidUYU)}
                </div>
              )}
            </div>

            {!cashRegister && (
              <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">No hay caja abierta hoy</p>
                  <p className="mt-0.5">Abrí la caja antes de registrar una venta.</p>
                  <a href="/cash-register" className="underline font-medium mt-1 inline-block hover:text-red-900">Ir a Caja →</a>
                </div>
              </div>
            )}

            <Button
              className={`w-full mt-4 ${saved ? "bg-green-600 hover:bg-green-700" : "bg-[#E8461E] hover:bg-[#c73a15]"}`}
              onClick={handleSave}
              disabled={saving || !canSave || saved}
            >
              {saved ? (
                <><Check className="h-4 w-4 mr-2" />¡Venta registrada!</>
              ) : saving ? (
                "Guardando..."
              ) : (
                <><ShoppingCart className="h-4 w-4 mr-2" />Confirmar Venta</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}