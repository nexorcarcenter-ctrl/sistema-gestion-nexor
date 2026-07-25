import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Product } from "@/entities/Product";
import { Sale } from "@/entities/Sale";
import { StockMovement } from "@/entities/StockMovement";
import { Category } from "@/entities/Category";
import { CashRegister } from "@/entities/CashRegister";
import User from "@/entities/User.js";
import { Search, ShoppingCart, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CartItem from "../components/CartItem";
import ProductGrid from "../components/ProductGrid";
import PaymentDialog from "../components/PaymentDialog";
import { useLanguage } from "../context/LanguageContext";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
function parseTiers(raw) { try { return JSON.parse(raw || "[]"); } catch { return []; } }
function getDiscount(tiers, qty) {
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty);
  const match = sorted.find((t) => qty >= t.min_qty);
  return match ? match.discount_pct : 0;
}

export default function PointOfSale() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(""); const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false); const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState(""); const [isProcessing, setIsProcessing] = useState(false); const [showSuccess, setShowSuccess] = useState(false);
  const [cashRegister, setCashRegister] = useState(null);
  const [cashRegisterLoaded, setCashRegisterLoaded] = useState(false);

  useEffect(() => {
    const _n = new Date();
    const today = `${_n.getFullYear()}-${String(_n.getMonth() + 1).padStart(2, "0")}-${String(_n.getDate()).padStart(2, "0")}`;
    CashRegister.filter({ status: "open" }, "-opened_at", 20).then(registers => {
      const todayReg = registers.find(r => (r.date || "").split("T")[0] === today);
      setCashRegister(todayReg || null);
      setCashRegisterLoaded(true);
    });
  }, []);
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => Product.filter({ is_active: true, status: "active" }, "name", 500) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => Category.filter({ is_active: true }, "sort_order", 50) });
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => User.me() });
  const filtered = useMemo(() => products.filter((p) => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return ms && (categoryFilter === "all" || p.category === categoryFilter) && p.stock_quantity > 0;
  }), [products, search, categoryFilter]);

  const calcItem = useCallback((item, qty) => {
    const tiers = parseTiers(item.volume_discounts);
    const pct = getDiscount(tiers, qty);
    const discounted = item.unit_price * (1 - pct / 100);
    return { ...item, quantity: qty, discount_pct: pct, total: qty * discounted };
  }, []);

  const addToCart = (product) => setCart((prev) => {
    const ex = prev.find((i) => i.id === product.id);
    if (ex) {
      if (ex.quantity >= product.stock_quantity) return prev;
      return prev.map((i) => i.id === product.id ? calcItem(i, i.quantity + 1) : i);
    }
    const item = { id: product.id, name: product.name, sku: product.sku, unit_price: product.unit_price, volume_discounts: product.volume_discounts, stock: product.stock_quantity };
    return [...prev, calcItem(item, 1)];
  });
  const updateQty = (id, qty) => { if (qty >= 1) setCart((prev) => prev.map((i) => i.id === id ? calcItem(i, qty) : i)); };
  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.id !== id));
  const subtotal = cart.reduce((sum, i) => sum + i.total, 0);
  const totalDiscount = cart.reduce((sum, i) => sum + (i.unit_price * i.quantity - i.total), 0);
  const total = subtotal;
  const change = paymentMethod === "cash" && amountPaid ? Math.max(0, parseFloat(amountPaid) - total) : 0;

  const completeSale = async () => {
    setIsProcessing(true);
    const saleNumber = `S-${Date.now().toString(36).toUpperCase()}`;
    const cashier = currentUser?.fullName || currentUser?.username || "Unknown";
    await Sale.create({
      sale_number: saleNumber, sale_date: new Date().toISOString(), cashier,
      items_json: JSON.stringify(cart.map((i) => ({ product_id: i.id, product_name: i.name, sku: i.sku, quantity: i.quantity, unit_price: i.unit_price, discount: i.discount_pct, total: i.total }))),
      items_count: cart.reduce((s, i) => s + i.quantity, 0), subtotal, tax_amount: 0, discount_amount: totalDiscount, total,
      payment_method: paymentMethod, payment_status: "paid", amount_paid: paymentMethod === "cash" ? parseFloat(amountPaid) || total : total, change_given: change, status: "completed",
    });
    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      if (product) {
        const ns = product.stock_quantity - item.quantity;
        await Product.update(item.id, { stock_quantity: ns });
        await StockMovement.create({ product_id: item.id, product_name: item.name, sku: item.sku, movement_type: "sale", quantity: -item.quantity, previous_stock: product.stock_quantity, new_stock: ns, reference_type: "sale", reference_number: saleNumber, reason: "POS Sale" });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["products"] }); queryClient.invalidateQueries({ queryKey: ["sales"] }); queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    setIsProcessing(false); setShowPayment(false); setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); setCart([]); setAmountPaid(""); }, 2000);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-6rem)]">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder={t("searchProducts")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")} {t("categories")}</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto"><ProductGrid products={filtered} onAdd={addToCart} /></div>
      </div>
      <div className="w-full md:w-80 bg-white rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b"><div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-orange-600" /><h2 className="font-semibold text-slate-900">{t("cart")}</h2><span className="ml-auto text-sm text-slate-500">{cart.length} {t("items")}</span></div></div>
        <div className="flex-1 overflow-y-auto p-4">{cart.length ? cart.map((item) => <CartItem key={item.id} item={item} onUpdateQty={updateQty} onRemove={removeItem} />) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><ShoppingCart className="h-12 w-12 mb-2 opacity-30" /><p className="text-sm">{t("emptyCart")}</p></div>}</div>
        <div className="p-4 border-t bg-slate-50 rounded-b-xl space-y-2">
          <div className="flex justify-between text-sm"><span className="text-slate-500">{t("subtotal")}</span><span>{fmt(subtotal)}</span></div>
          {totalDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-emerald-600">{t("discount")}</span><span className="text-emerald-600">-{fmt(totalDiscount)}</span></div>}
          <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>{t("total")}</span><span className="text-orange-600">{fmt(total)}</span></div>
          {cashRegisterLoaded && !cashRegister && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">No hay caja abierta</p>
                <a href="/cash-register" className="underline hover:text-red-900">Ir a Caja →</a>
              </div>
            </div>
          )}
          <Button className="w-full bg-orange-600 hover:bg-orange-700 mt-3" disabled={!cart.length || !cashRegister} onClick={() => setShowPayment(true)}>{t("completeSale")}</Button>
        </div>
      </div>
      <PaymentDialog open={showPayment} onOpenChange={setShowPayment} total={total} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} amountPaid={amountPaid} setAmountPaid={setAmountPaid} change={change} isProcessing={isProcessing} onConfirm={completeSale} />
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <Check className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">¡Venta Completada!</h2>
            <p className="text-slate-500">Transacción procesada exitosamente</p>
          </div>
        </div>
      )}
    </div>
  );
}