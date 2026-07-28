import { useState, useEffect } from "react";
import { ServiceType } from "@/entities/ServiceType";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wrench, Search } from "lucide-react";

function ServiceTypeForm({ serviceType, onSave, onClose }) {
  const [form, setForm] = useState({
    name: serviceType?.name || "",
    description: serviceType?.description || "",
    status: serviceType?.status || "active",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (serviceType?.id) {
      await ServiceType.update(serviceType.id, form);
    } else {
      await ServiceType.create(form);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Nombre del tipo de servicio *</Label>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Ej: Colocación de radio"
          autoFocus
        />
      </div>
      <div>
        <Label>Descripción</Label>
        <Textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Descripción opcional..."
          rows={2}
        />
      </div>
      <div>
        <Label>Estado</Label>
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export default function ServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await ServiceType.list("name");
      setServiceTypes(data);
    } catch {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este tipo de servicio?")) return;
    await ServiceType.delete(id);
    load();
  };

  const filtered = serviceTypes.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tipos de Servicio</h1>
          <p className="text-sm text-slate-500">Catálogo de servicios disponibles en el taller</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Tipo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar tipo de servicio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay tipos de servicio configurados</p>
          <Button className="mt-4" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Crear primero
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(st => (
            <div key={st.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 bg-[#E8461E]/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Wrench className="h-4 w-4 text-[#E8461E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{st.name}</p>
                  {st.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{st.description}</p>
                  )}
                  <Badge
                    variant={st.status === "active" ? "default" : "secondary"}
                    className="text-[10px] mt-1.5"
                  >
                    {st.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => { setEditing(st); setDialogOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                  onClick={() => handleDelete(st.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Tipo de Servicio" : "Nuevo Tipo de Servicio"}</DialogTitle>
          </DialogHeader>
          <ServiceTypeForm
            serviceType={editing}
            onSave={() => { setDialogOpen(false); load(); }}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}