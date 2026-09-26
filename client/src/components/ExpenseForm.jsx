import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseCategory } from "@/entities/ExpenseCategory";
import { getDefaultExchangeRate } from "@/utils";
import { Plus, Check, X } from "lucide-react";
import CotizacionDelDia, { useCotizacion } from "./CotizacionDelDia";
import moment from "moment";

const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-UY")}`;

export default function ExpenseForm({ open, onClose, onGuardar, categorias, metodos, gasto, onCategoriaCreada }) {
  const editando = !!gasto;
  const [form, setForm] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const { data: cotizacion } = useCotizacion();
  const tcPropuesto = String(cotizacion?.venta || getDefaultExchangeRate());

  useEffect(() => {
    if (!open) return;
    setError("");
    setNuevaCategoria(null);
    setForm(gasto ? {
      expense_date: moment(gasto.expense_date).format("YYYY-MM-DD"),
      category_id: gasto.category_id || "",
      description: gasto.description || "",
      amount: String(gasto.amount ?? ""),
      currency: gasto.currency || "UYU",
      exchange_rate: String(gasto.exchange_rate || getDefaultExchangeRate()),
      payment_method_id: gasto.payment_method_id || "",
      supplier_name: gasto.supplier_name || "",
      is_fixed: !!gasto.is_fixed,
      notes: gasto.notes || "",
    } : {
      expense_date: moment().format("YYYY-MM-DD"),
      category_id: "",
      description: "",
      amount: "",
      currency: "UYU",
      exchange_rate: tcPropuesto,
      payment_method_id: "",
      supplier_name: "",
      is_fixed: false,
      notes: "",
    });
  }, [open, gasto]);

  if (!open || !form) return null;

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const monto = parseFloat(form.amount) || 0;
  const tc = parseFloat(form.exchange_rate) || 1;
  const enPesos = form.currency === "USD" ? monto * tc : monto;

  const crearCategoria = async () => {
    const nombre = (nuevaCategoria || "").trim();
    if (!nombre) return;
    const creada = await ExpenseCategory.create({ name: nombre, sort_order: 50 });
    await onCategoriaCreada?.();
    set("category_id", creada.id);
    setNuevaCategoria(null);
  };

  const guardar = async () => {
    if (monto <= 0) return setError("Poné un monto mayor a cero");
    if (!form.category_id) return setError("Elegí de qué es el gasto");

    setGuardando(true);
    setError("");
    try {
      const categoria = categorias.find((c) => c.id === form.category_id);
      const metodo = metodos.find((m) => m.id === form.payment_method_id);
      await onGuardar({
        ...form,
        amount: monto,
        exchange_rate: form.currency === "USD" ? tc : 1,
        amount_uyu: enPesos,
        category_name: categoria?.name || "",
        payment_method_name: metodo?.name || "",
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
        </DialogHeader>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

        <div className="space-y-3">
          <div>
            <Label>Monto</Label>
            <div className="flex gap-2">
              <Input
                type="number" min="0" inputMode="decimal" autoFocus
                value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0"
              />
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="UYU">$ UYU</option>
                <option value="USD">US$</option>
              </select>
            </div>
            {form.currency === "USD" && (
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs text-slate-500 shrink-0">Tipo de cambio</Label>
                <Input
                  type="number" min="0" className="h-8"
                  value={form.exchange_rate} onChange={(e) => set("exchange_rate", e.target.value)}
                />
                <span className="text-xs font-semibold text-slate-700 shrink-0">= {fmt(enPesos)}</span>
              </div>
            )}
            {form.currency === "USD" && <CotizacionDelDia valorActual={form.exchange_rate} onUsar={(v) => set("exchange_rate", String(v))} />}
          </div>

          <div>
            <Label>¿De qué es?</Label>
            {nuevaCategoria === null ? (
              <div className="flex gap-2">
                <select
                  value={form.category_id}
                  onChange={(e) => set("category_id", e.target.value)}
                  className="flex-1 h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
                >
                  <option value="">Elegir…</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button type="button" variant="outline" size="icon" title="Agregar categoría" onClick={() => setNuevaCategoria("")}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  autoFocus placeholder="Nombre de la categoría"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && crearCategoria()}
                />
                <Button type="button" size="icon" onClick={crearCategoria}><Check className="h-4 w-4" /></Button>
                <Button type="button" variant="outline" size="icon" onClick={() => setNuevaCategoria(null)}><X className="h-4 w-4" /></Button>
              </div>
            )}
          </div>

          <div>
            <Label>Detalle</Label>
            <Input
              value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Alquiler local agosto, UTE julio…"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} max={moment().format("YYYY-MM-DD")} />
            </div>
            <div>
              <Label>Forma de pago</Label>
              <select
                value={form.payment_method_id}
                onChange={(e) => set("payment_method_id", e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="">Sin especificar</option>
                {metodos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Proveedor (opcional)</Label>
            <Input value={form.supplier_name} onChange={(e) => set("supplier_name", e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.is_fixed} onChange={(e) => set("is_fixed", e.target.checked)} className="rounded" />
            Se repite todos los meses
            <span className="text-xs text-slate-400">(para poder copiarlo)</span>
          </label>

          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 bg-[#E8461E] hover:bg-[#c73a15]" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : `Cargar ${fmt(enPesos)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
