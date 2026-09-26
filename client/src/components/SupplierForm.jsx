import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONDICIONES_PAGO } from "./purchaseFormat";

// Solo los campos que se editan: el resto de la fila (totales, fechas) lo
// maneja el servidor y no tiene que viajar de vuelta al guardar
const CAMPOS = ["name", "contact_name", "tax_id", "phone", "email", "address", "city", "payment_terms", "notes"];

export default function SupplierForm({ supplier, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => {
    const base = { payment_terms: "immediate" };
    for (const c of CAMPOS) if (supplier?.[c] != null) base[c] = supplier[c];
    return base;
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const campo = (k, etiqueta, props = {}) => (
    <div>
      <Label>{etiqueta}</Label>
      <Input value={form[k] || ""} onChange={(e) => update(k, e.target.value)} {...props} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {campo("name", "Empresa *", { placeholder: "Nombre del proveedor", autoFocus: true })}
        {campo("tax_id", "RUT")}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {campo("contact_name", "Persona de contacto")}
        {campo("phone", "Teléfono")}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {campo("email", "Email", { type: "email" })}
        <div>
          <Label>Condición de pago</Label>
          <select
            value={form.payment_terms || "immediate"}
            onChange={(e) => update("payment_terms", e.target.value)}
            className="w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
          >
            {CONDICIONES_PAGO.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {campo("address", "Dirección")}
        {campo("city", "Ciudad")}
      </div>
      <div>
        <Label>Notas</Label>
        <Textarea value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave({ ...form, name: (form.name || "").trim() })} disabled={!form.name?.trim() || isSaving} className="bg-[#E8461E] hover:bg-[#c73a15]">
          {isSaving ? "Guardando…" : "Guardar proveedor"}
        </Button>
      </div>
    </div>
  );
}
