import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import VolumeDiscountEditor from "./VolumeDiscountEditor";
import { StockMovement } from "@/entities/StockMovement";
import { useLanguage } from "../context/LanguageContext";
import { Wand2, Sparkles, TrendingUp } from "lucide-react";


function parseTiers(raw) { try { return JSON.parse(raw || "[]"); } catch { return []; } }
function parseModels(raw) { try { return JSON.parse(raw || "[]"); } catch { return []; } }

const CATEGORY_PREFIXES = {
  "Marcos": "MAR", "Radios": "RAD", "Interfaces": "INT", "Camaras": "CAM",
  "Audio": "AUD", "Seguridad": "SEG", "Iluminacion": "ILU", "Accesorios": "ACC",
  "Servicios": "SRV", "Interior": "INR"
};

function normalizeCategory(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function generateSKU(category, existingProducts) {
  // Find prefix with accent-insensitive match
  const normCat = normalizeCategory(category);
  const prefixKey = Object.keys(CATEGORY_PREFIXES).find(k => normalizeCategory(k) === normCat);
  const prefix = prefixKey ? CATEGORY_PREFIXES[prefixKey] : (category?.slice(0, 3).toUpperCase() || "PRD");
  // Find highest existing number for this prefix to avoid collisions
  const existing = existingProducts
    .map(p => p.sku || "")
    .filter(s => s.startsWith(prefix + "-"))
    .map(s => parseInt(s.split("-")[1]) || 0);
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function normalize(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
}

function findSimilar(name, products, currentId) {
  if (!name || name.length < 4) return null;
  const normalizedName = normalize(name);
  for (const p of products) {
    if (p.id === currentId) continue;
    if (normalize(p.name) === normalizedName) return p;
  }
  return null;
}

// Combobox simple con sugerencias
function ComboboxInput({ value, onChange, suggestions = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setInputVal(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = suggestions.filter((s) => s.toLowerCase().includes(inputVal.toLowerCase()) && s.toLowerCase() !== inputVal.toLowerCase());

  return (
    <div className="relative" ref={ref}>
      <Input value={inputVal} onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} placeholder={placeholder} />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <div key={s} className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 hover:text-orange-700"
              onMouseDown={() => { setInputVal(s); onChange(s); setOpen(false); }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function productToSnake(p) {
  if (!p) return null;
  const result = {};
  for (const [k, v] of Object.entries(p)) {
    const col = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    result[col] = v;
  }
  return result;
}

export default function ProductForm({ product, categories = [], suppliers = [], carBrands = [], existingProducts = [], onSave, onCancel, isSaving }) {
  const { t } = useLanguage();
  const isNew = !product;
  const productSnake = productToSnake(product);
  const [form, setForm] = useState(productSnake || { status: "active", unit: "unit", stock_quantity: 0, min_stock: 1, is_active: true, volume_discounts: "[]" });
  const [hasVehicle, setHasVehicle] = useState(!!(productSnake?.car_brand || productSnake?.car_model || productSnake?.car_year));
  const [detecting, setDetecting] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState(null);
  const [duplicate, setDuplicate] = useState(null);
  const [costHistory, setCostHistory] = useState([]);

  useEffect(() => {
    if (!isNew && product?.id) {
      StockMovement.filter({ product_id: product.id, movement_type: "purchase" }, "-created_at", 10)
        .then(setCostHistory).catch(() => {});
    }
  }, [product?.id, isNew]);
  const debounceRef = useRef(null);
  const dupDebounceRef = useRef(null);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const tiers = parseTiers(form.volume_discounts);

  const brandNames = carBrands.map((b) => b.name);
  const selectedBrandEntry = carBrands.find((b) => b.name.toLowerCase() === (form.car_brand || "").toLowerCase());
  const modelSuggestions = selectedBrandEntry ? parseModels(selectedBrandEntry.models_json) : [];

  const handleVehicleToggle = (checked) => {
    setHasVehicle(checked);
    if (!checked) setForm((f) => ({ ...f, car_brand: null, car_model: null, car_year: null }));
  };

  const detectFromName = async (name) => {
    if (!name || name.length < 5) return;
    // IA de detección no disponible — no hace nada
    return;

    setForm((f) => {
      const updates = { ...f };
      // Auto-assign category + generate SKU
      if (data.category) {
        const matched = categories.find(c => normalizeCategory(c.name) === normalizeCategory(data.category));
        if (matched) {
          updates.category = matched.name;
          if (!f.sku || f.sku === "") {
            updates.sku = generateSKU(matched.name, existingProducts);
          }
          setDetectedCategory(matched.name);
        }
      }
      // Auto-assign vehicle
      if (data.car_brand || data.car_model || data.car_year) {
        setHasVehicle(true);
        updates.car_brand = data.car_brand || f.car_brand || "";
        updates.car_model = data.car_model || f.car_model || "";
        updates.car_year = data.car_year || f.car_year || "";
      }
      return updates;
    });
  };

  const handleNameChange = (val) => {
    update("name", val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => detectFromName(val), 900);
    if (dupDebounceRef.current) clearTimeout(dupDebounceRef.current);
    dupDebounceRef.current = setTimeout(() => {
      setDuplicate(findSimilar(val, existingProducts, product?.id));
    }, 500);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (dupDebounceRef.current) clearTimeout(dupDebounceRef.current);
  }, []);

  return (
    <div className="space-y-4 overflow-y-auto pr-1">

      {/* Nombre */}
      <div>
        <Label>{t("name")} *</Label>
        <div className="relative">
          <Input value={form.name || ""} onChange={(e) => handleNameChange(e.target.value)} className={detecting ? "pr-8" : ""} placeholder="Ej: Radio Pioneer DMH-A4450BT" />
          {detecting && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Wand2 className="h-4 w-4 text-orange-500 animate-pulse" />
            </div>
          )}
        </div>
        {detectedCategory && isNew && (
          <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Categoría detectada: <strong>{detectedCategory}</strong> · SKU: <strong>{form.sku}</strong>
          </p>
        )}
      </div>

      {/* Proveedor */}
      <div>
        <Label>{t("supplier")}</Label>
        <Select value={form.supplier_id || ""} onValueChange={(v) => { const s = suppliers.find(x => x.id === v); update("supplier_id", v); update("supplier_name", s?.name || ""); }}>
          <SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
          <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div><Label>{t("stockQty")}</Label><Input type="number" value={form.stock_quantity || 0} onChange={(e) => update("stock_quantity", parseInt(e.target.value) || 0)} /></div>
        <div><Label>{t("minStock")}</Label><Input type="number" value={form.min_stock || 5} onChange={(e) => update("min_stock", parseInt(e.target.value) || 0)} /></div>
      </div>

      {/* SKU + Precio de venta */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("sku")} *</Label>
          <Input
            value={form.sku || ""}
            onChange={(e) => update("sku", e.target.value)}
            placeholder="Ej: RAD-001"
          />
          {isNew && !form.sku && (
            <p className="text-xs text-slate-400 mt-1">Se genera automáticamente al detectar la categoría</p>
          )}
        </div>
        <div>
          <Label>{t("sellingPrice")}</Label>
          <Input type="number" step="0.01" value={form.unit_price || ""} onChange={(e) => update("unit_price", parseFloat(e.target.value) || 0)} placeholder="0" />
        </div>
      </div>

      {/* Costo + Categoría */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("costPrice")}</Label>
          <Input type="number" step="0.01" value={form.cost_price || ""} onChange={(e) => update("cost_price", parseFloat(e.target.value) || 0)} placeholder="0" />
        </div>
        <div>
          <Label>{t("category")}</Label>
          <Select value={form.category || ""} onValueChange={(v) => { update("category", v); if (isNew && !form.sku) update("sku", generateSKU(v, existingProducts)); }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Unidad + Estado */}
      <div className="grid grid-cols-2 gap-4">
        <div><Label>{t("unit")}</Label>
          <Select value={form.unit || "unit"} onValueChange={(v) => update("unit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unit">Unidad</SelectItem>
              <SelectItem value="kit">Kit</SelectItem>
              <SelectItem value="par">Par</SelectItem>
              <SelectItem value="m">Metro</SelectItem>
              <SelectItem value="kg">Kg</SelectItem>
              <SelectItem value="box">Caja</SelectItem>
              <SelectItem value="pack">Pack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>{t("status")}</Label>
          <Select value={form.status || "active"} onValueChange={(v) => update("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
              <SelectItem value="discontinued">Descontinuado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div><Label>{t("description")}</Label><Textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)} rows={2} /></div>
      {!isNew && <VolumeDiscountEditor tiers={tiers} onChange={(v) => update("volume_discounts", JSON.stringify(v))} t={t} />}

      {/* Vehículo */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={hasVehicle} onChange={(e) => handleVehicleToggle(e.target.checked)} className="w-4 h-4 accent-orange-600" />
          <span className="text-sm font-medium text-slate-700">Aplica a vehículo específico</span>
          {detecting && <span className="text-xs text-orange-500 flex items-center gap-1"><Wand2 className="h-3 w-3" /> Detectando...</span>}
        </label>
        {hasVehicle && (
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Marca auto</Label><ComboboxInput value={form.car_brand || ""} onChange={(v) => update("car_brand", v)} suggestions={brandNames} placeholder="Ej: Toyota" /></div>
            <div><Label>Modelo auto</Label><ComboboxInput value={form.car_model || ""} onChange={(v) => update("car_model", v)} suggestions={modelSuggestions} placeholder="Ej: Corolla" /></div>
            <div><Label>Año modelo</Label><Input type="number" value={form.car_year || ""} onChange={(e) => update("car_year", e.target.value === "" ? null : parseInt(e.target.value))} placeholder="Ej: 2020" /></div>
          </div>
        )}
      </div>

      {/* Alerta duplicado */}
      {duplicate && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-800">
          <span className="text-lg leading-none">⚠️</span>
          <span>Producto similar encontrado: <strong>"{duplicate.name}"</strong> (SKU: {duplicate.sku || "—"}). Verificá si ya existe antes de agregar.</span>
        </div>
      )}

      {/* Historial de costos */}
      {!isNew && costHistory.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Historial de costos</span>
          </div>
          <div className="space-y-1">
            {costHistory.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-mono text-slate-400">
                    {new Date(m.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </span>
                  {m.reference_number && (
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{m.reference_number}</span>
                  )}
                  <span className="text-slate-400">×{m.quantity} ud.</span>
                </div>
                <span className={`font-semibold ${i === 0 ? "text-orange-600" : "text-slate-500"}`}>
                  ${Number(m.unit_cost).toLocaleString("es-UY")}
                  {i === 0 && <span className="ml-1 text-[10px] font-normal text-orange-400">actual</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>{t("cancel")}</Button>
        <Button
          onClick={() => onSave(form)}
          disabled={!form.name || !form.sku || isSaving || !!duplicate || detecting}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {isSaving ? t("loading") : detecting ? "Detectando..." : t("save")}
        </Button>
      </div>
    </div>
  );
}