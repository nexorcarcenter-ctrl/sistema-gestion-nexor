import { useState, useEffect } from "react";
import { PaymentMethod } from "@/entities/PaymentMethod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Banknote, CreditCard, ArrowLeftRight, FileCheck, MoreHorizontal, Eye, EyeOff, Trash2 } from "lucide-react";

const TYPE_CONFIG = {
  cash:     { label: "Efectivo",        icon: Banknote,        color: "text-green-600 bg-green-50" },
  card:     { label: "Tarjeta",         icon: CreditCard,      color: "text-blue-600 bg-blue-50" },
  transfer: { label: "Transferencia",   icon: ArrowLeftRight,  color: "text-purple-600 bg-purple-50" },
  check:    { label: "Cheque",          icon: FileCheck,       color: "text-[#E8461E] bg-[#E8461E]/5" },
  other:    { label: "Otro",            icon: MoreHorizontal,  color: "text-slate-600 bg-slate-50" },
};

const CURRENCY_FLAGS = { UYU: "🇺🇾", USD: "🇺🇸" };

const DEFAULT_METHODS = [
  { name: "Efectivo UYU", currency: "UYU", type: "cash",     is_active: true, sort_order: 1 },
  { name: "Tarjeta UYU",  currency: "UYU", type: "card",     is_active: true, sort_order: 2 },
  { name: "Transferencia UYU", currency: "UYU", type: "transfer", is_active: true, sort_order: 3 },
  { name: "Efectivo USD", currency: "USD", type: "cash",     is_active: true, sort_order: 4 },
  { name: "Transferencia USD", currency: "USD", type: "transfer", is_active: true, sort_order: 5 },
];

function MethodForm({ method, onSave, onClose }) {
  const [form, setForm] = useState({
    name: method?.name || "",
    currency: method?.currency || "UYU",
    type: method?.type || "cash",
    sort_order: method?.sort_order ?? 0,
    notes: method?.notes || "",
    is_active: method?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const payload = { name: form.name, currency: form.currency, type: form.type, sort_order: form.sort_order, notes: form.notes };
    if (method?.id) {
      await PaymentMethod.update(method.id, payload);
    } else {
      await PaymentMethod.create({ ...payload, is_active: true });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Nombre *</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Efectivo UYU" className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Moneda</Label>
          <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UYU">🇺🇾 Peso Uruguayo (UYU)</SelectItem>
              <SelectItem value="USD">🇺🇸 Dólar (USD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Orden de aparición</Label>
        <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="mt-1 w-24" />
      </div>
      <div>
        <Label className="text-xs">Notas (opcional)</Label>
        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1 text-sm" placeholder="Descripción adicional..." />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export default function PaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMethod, setEditMethod] = useState(null);
  const [creatingDefaults, setCreatingDefaults] = useState(false);
  const [error, setError] = useState(null);

  const loadMethods = async () => {
    try {
      const data = await PaymentMethod.list("sort_order", 100);
      setMethods(data);
    } catch {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMethods(); }, []);

  const handleToggle = async (method) => {
    await PaymentMethod.update(method.id, { is_active: !method.is_active });
    setMethods(prev => prev.map(m => m.id === method.id ? { ...m, is_active: !m.is_active } : m));
  };

  const handleCreateDefaults = async () => {
    setCreatingDefaults(true);
    await PaymentMethod.bulkCreate(DEFAULT_METHODS);
    await loadMethods();
    setCreatingDefaults(false);
  };

  const handleDelete = async (method) => {
    if (!window.confirm(`¿Eliminár "${method.name}"? Esta acción no se puede deshacer.`)) return;
    await PaymentMethod.delete(method.id);
    setMethods(prev => prev.filter(m => m.id !== method.id));
  };

  const openEdit = (method) => { setEditMethod(method); setShowForm(true); };
  const openNew = () => { setEditMethod(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); loadMethods(); };

  const active = methods.filter(m => m.is_active);
  const inactive = methods.filter(m => !m.is_active);

  return (
    <div className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Métodos de Pago</h1>
          <p className="text-sm text-slate-500">Configurá las monedas y formas de pago del taller</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />Agregar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : methods.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-sm">
          <Banknote className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-600">No hay métodos de pago configurados</p>
          <p className="text-sm text-slate-400 mt-1">Podés crear los métodos por defecto o agregar los tuyos</p>
          <div className="flex gap-3 justify-center mt-4">
            <Button variant="outline" onClick={handleCreateDefaults} disabled={creatingDefaults}>
              {creatingDefaults ? "Creando..." : "Crear métodos por defecto"}
            </Button>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Agregar manualmente</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Activos ({active.length})
            </h2>
            <div className="space-y-2">
              {active.map(m => {
                const typeCfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.other;
                const Icon = typeCfg.icon;
                return (
                  <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeCfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{m.name}</span>
                        <span className="text-sm">{CURRENCY_FLAGS[m.currency]}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{typeCfg.label}</span>
                      </div>
                      {m.notes && <p className="text-xs text-slate-400 mt-0.5">{m.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleToggle(m)} className="p-1.5 text-green-500 hover:text-slate-400 hover:bg-slate-100 rounded-lg" title="Desactivar">
                        <EyeOff className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(m)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inactive */}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Inactivos ({inactive.length})
              </h2>
              <div className="space-y-2">
                {inactive.map(m => {
                  const typeCfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.other;
                  const Icon = typeCfg.icon;
                  return (
                    <div key={m.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4 opacity-60">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100">
                        <Icon className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-slate-500">{m.name}</span>
                        <span className="text-sm ml-2">{CURRENCY_FLAGS[m.currency]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleToggle(m)} className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-slate-100 rounded-lg" title="Activar">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(m)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMethod ? "Editar método de pago" : "Nuevo método de pago"}</DialogTitle>
          </DialogHeader>
          <MethodForm method={editMethod} onSave={handleSaved} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}