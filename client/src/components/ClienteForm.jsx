import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Customer } from "@/entities/Customer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PLAZOS_CREDITO } from "./purchaseFormat";

const CAMPOS = ["name", "phone", "tax_id", "email", "address", "credit_days", "notes"];

/**
 * Alta o edición de un cliente. El servidor rechaza duplicados por nombre,
 * teléfono o documento, y el mensaje se muestra acá.
 */
export default function ClienteForm({ abierto, cliente, nombreInicial = "", onClose, onGuardado }) {
  const [form, setForm] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!abierto) return;
    const base = { name: nombreInicial, credit_days: 30 };
    for (const c of CAMPOS) if (cliente?.[c] != null) base[c] = cliente[c];
    setForm(base);
    guardar.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, cliente?.id]);

  const guardar = useMutation({
    mutationFn: (datos) => (cliente ? Customer.update(cliente.id, datos) : Customer.create({ ...datos, is_active: true })),
    onSuccess: (c) => { onGuardado?.(c); onClose(); },
  });

  if (!abierto || !form) return null;
  const campo = (k, etiqueta, props = {}) => (
    <div>
      <Label>{etiqueta}</Label>
      <Input value={form[k] || ""} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
        {guardar.error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{guardar.error.message}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">{campo("name", "Nombre o razón social *", { autoFocus: true })}</div>
          {campo("phone", "Teléfono")}
          {campo("tax_id", "RUT o cédula")}
          {campo("email", "Email", { type: "email" })}
          <div>
            <Label>Plazo habitual</Label>
            <select value={form.credit_days || 30} onChange={(e) => set("credit_days", Number(e.target.value))} className="w-full h-10 rounded-md border border-slate-200 bg-white px-2 text-sm">
              {PLAZOS_CREDITO.map((d) => <option key={d} value={d}>{d} días</option>)}
            </select>
          </div>
          <div className="col-span-2">{campo("address", "Dirección")}</div>
          <div className="col-span-2">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            className="bg-[#E8461E] hover:bg-[#c73a15]"
            disabled={!form.name?.trim() || guardar.isPending}
            onClick={() => guardar.mutate({ ...form, name: form.name.trim() })}
          >
            {guardar.isPending ? "Guardando…" : "Guardar cliente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
