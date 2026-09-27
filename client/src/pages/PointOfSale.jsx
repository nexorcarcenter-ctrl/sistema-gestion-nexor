import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Product } from "@/entities/Product";
import { Sale } from "@/entities/Sale";
import { Category } from "@/entities/Category";
import { CashRegister } from "@/entities/CashRegister";
import { Search, ShoppingCart, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CartItem from "../components/CartItem";
import ProductGrid from "../components/ProductGrid";
import PosCobroDialog from "../components/PosCobroDialog";
import { useLanguage } from "../context/LanguageContext";

const fmt = (v) => `$ ${Math.round(Number(v) || 0).toLocaleString("es-UY")}`;
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
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); const [showSuccess, setShowSuccess] = useState(false);
  const [errorCobro, setErrorCobro] = useState("");
  const [ultimaVenta, setUltimaVenta] = useState(null);
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
  const { data: products = [] } = useQuery({ queryKey: ["products", "pos"], queryFn: () => Product.filter({ is_active: true, status: "active" }, "name", 5000) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => Category.filter({ is_active: true }, "sort_order", 50) });
  const filtered = useMemo(() => products.filter((p) => {
    const q = search.toLowerCase();
    const ms = !search || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q);
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

  // El lector de código de barras escribe el código y manda Enter: si hay un
  // producto con ese código (o ese SKU) exacto, va directo al carrito
  const alEnter = (e) => {
    if (e.key !== "Enter") return;
    const q = search.trim().toLowerCase();
    if (!q) return;
    const exacto = products.find((p) => (p.barcode || "").toLowerCase() === q || (p.sku || "").toLowerCase() === q);
    const unico = filtered.length === 1 ? filtered[0] : null;
    const elegido = exacto || unico;
    if (elegido && elegido.stock_quantity > 0) { addToCart(elegido); setSearch(""); }
  };

  // Se guarda por la misma ruta que la venta directa: venta, stock, caja y
  // arqueo en una sola transacción
  const completeSale = async (pagos) => {
    setIsProcessing(true);
    setErrorCobro("");
    try {
      const venta = await Sale.registrarContado({
        origen: "pos",
        items: cart.map((i) => ({ product_id: i.id, product_name: i.name, sku: i.sku, quantity: i.quantity, unit_price: i.unit_price, discount_pct: i.discount_pct || 0 })),
        pagos,
        cash_register_id: cashRegister?.id,
      });
      ["products", "sales", "stock-movements"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      setUltimaVenta(venta);
      setShowPayment(false); setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); setCart([]); }, 2000);
    } catch (e) {
      setErrorCobro(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-6rem)]">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Buscar por nombre, SKU o código de barras" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={alEnter} className="pl-9" autoFocus /></div>
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
        <div className="p-4 border-b"><div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-[#E8461E]" /><h2 className="font-semibold text-slate-900">{t("cart")}</h2><span className="ml-auto text-sm text-slate-500">{cart.length} {t("items")}</span></div></div>
        <div className="flex-1 overflow-y-auto p-4">{cart.length ? cart.map((item) => <CartItem key={item.id} item={item} onUpdateQty={updateQty} onRemove={removeItem} />) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><ShoppingCart className="h-12 w-12 mb-2 opacity-30" /><p className="text-sm">{t("emptyCart")}</p></div>}</div>
        <div className="p-4 border-t bg-slate-50 rounded-b-xl space-y-2">
          <div className="flex justify-between text-sm"><span className="text-slate-500">{t("subtotal")}</span><span>{fmt(subtotal + totalDiscount)}</span></div>
          {totalDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-emerald-600">{t("discount")}</span><span className="text-emerald-600">-{fmt(totalDiscount)}</span></div>}
          <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>{t("total")}</span><span className="text-[#E8461E]">{fmt(total)}</span></div>
          {cashRegisterLoaded && !cashRegister && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">No hay caja abierta</p>
                <a href="/cash-register" className="underline hover:text-red-900">Ir a Caja →</a>
              </div>
            </div>
          )}
          <Button className="w-full bg-[#E8461E] hover:bg-[#c73a15] mt-3" disabled={!cart.length || !cashRegister} onClick={() => setShowPayment(true)}>{t("completeSale")}</Button>
        </div>
      </div>
      <PosCobroDialog
        abierto={showPayment} total={total} procesando={isProcessing} error={errorCobro}
        onClose={() => { setShowPayment(false); setErrorCobro(""); }}
        onConfirmar={completeSale}
      />
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <Check className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">¡Venta Completada!</h2>
            <p className="text-slate-500">{ultimaVenta?.sale_number ? `${ultimaVenta.sale_number} · ${fmt(ultimaVenta.total)}` : "Transacción procesada exitosamente"}</p>
          </div>
        </div>
      )}
    </div>
  );
}