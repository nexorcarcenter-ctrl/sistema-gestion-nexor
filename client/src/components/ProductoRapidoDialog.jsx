import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Product } from "@/entities/Product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateSKU } from "./ProductForm";

const selectClase = "w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm";

/**
 * Alta rápida de un producto sin salir de la compra: solo lo necesario para
 * venderlo. El stock y el costo los pone la compra al registrarse; el resto
 * de la ficha (vehículo, descuentos, imagen) se completa después en Productos.
 */
export default function ProductoRapidoDialog({ nombreInicial, categorias = [], productos = [], onClose, onCreado }) {
  const abierto = nombreInicial !== null && nombreInicial !== undefined;
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!abierto) return;
    setError("");
    setForm({ name: nombreInicial || "", category: "", sku: generateSKU("", productos), unit_price: "", min_stock: "1", skuManual: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, nombreInicial]);

  const crear = useMutation({
    mutationFn: (datos) => Product.create(datos),
    onSuccess: (p) => { onCreado(p); onClose(); },
    onError: (e) => setError(e.message),
  });

  if (!abierto || !form) return null;

  const elegirCategoria = (cat) => setForm((f) => ({ ...f, category: cat, sku: f.skuManual ? f.sku : generateSKU(cat, productos) }));

  const enviar = () => {
    setError("");
    const nombre = form.name.trim();
    const sku = form.sku.trim();
    if (!nombre) return setError("Poné el nombre del producto");
    if (!sku) return setError("Poné un SKU");
    if (productos.some((p) => (p.sku || "").toLowerCase() === sku.toLowerCase())) return setError(`Ya hay un producto con el SKU ${sku}`);
    const igual = productos.find((p) => (p.name || "").trim().toLowerCase() === nombre.toLowerCase());
    if (igual) return setError(`Ya existe "${igual.name}" (${igual.sku}): buscalo en la compra en lugar de crearlo`);
    crear.mutate({
      name: nombre, sku, category: form.category || null,
      unit_price: parseFloat(form.unit_price) || 0, min_stock: parseInt(form.min_stock, 10) || 0,
      cost_price: 0, stock_quantity: 0, status: "active", unit: "unit", is_active: true, volume_discounts: "[]",
    });
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">El stock y el costo los carga la compra. El resto de la ficha se completa después en Productos.</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Categoría</Label>
            <select value={form.category} onChange={(e) => elegirCategoria(e.target.value)} className={selectClase}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>SKU *</Label>
            <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value, skuManual: true }))} />
          </div>
          <div>
            <Label>Precio de venta</Label>
            <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Stock mínimo</Label>
            <Input type="number" min="0" value={form.min_stock} onChange={(e) => set("min_stock", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={enviar} disabled={crear.isPending}>{crear.isPending ? "Creando…" : "Crear y agregar a la compra"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
