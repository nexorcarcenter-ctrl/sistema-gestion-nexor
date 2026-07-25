import { useState, useEffect } from "react";
import User from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Edit2, KeyRound, PowerOff, Power, ShieldCheck, User as UserIcon, Hash, Trash2 } from "lucide-react";

const CARGO_OPTIONS = ["Técnico", "Vendedor", "Administrativo", "Gerente", "otro"];

function UserFormDialog({ open, onClose, onSave, saving, error }) {
  const [form, setForm] = useState({ fullName: "", username: "", password: "", cargo: "Técnico" });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) setForm({ fullName: "", username: "", password: "", cargo: "Técnico" });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-orange-500" />Nuevo Usuario
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre completo</Label>
            <Input placeholder="Ej: Juan Pérez" value={form.fullName} onChange={e => update("fullName", e.target.value)} />
          </div>
          <div>
            <Label>Usuario</Label>
            <Input type="text" placeholder="Ej: juan" value={form.username} onChange={e => update("username", e.target.value)} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => update("password", e.target.value)} />
          </div>
          <div>
            <Label>Cargo</Label>
            <select
              value={form.cargo}
              onChange={e => update("cargo", e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              {CARGO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => onSave(form)}
              disabled={saving || !form.fullName || !form.username || !form.password}
            >
              {saving ? "Creando..." : "Crear Usuario"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ open, onClose, user, onSave, saving, error }) {
  const [form, setForm] = useState({ fullName: "", username: "", cargo: "" });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName || "", username: user.username || "", cargo: user.cargo || "otro" });
  }, [user]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-orange-500" />Editar Usuario
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre completo</Label>
            <Input value={form.fullName} onChange={e => update("fullName", e.target.value)} />
          </div>
          <div>
            <Label>Usuario</Label>
            <Input type="text" value={form.username} onChange={e => update("username", e.target.value)} />
          </div>
          <div>
            <Label>Cargo</Label>
            <select
              value={form.cargo}
              onChange={e => update("cargo", e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              {CARGO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => onSave(form)} disabled={saving || !form.fullName || !form.username}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ open, onClose, user, onSave, saving, error }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => { if (open) { setPassword(""); setConfirm(""); } }, [open]);

  const mismatch = confirm && password !== confirm;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-orange-500" />
            Cambiar Contraseña — {user?.fullName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nueva contraseña</Label>
            <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <Label>Confirmar contraseña</Label>
            <Input type="password" placeholder="Repetí la contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} className={mismatch ? "border-red-400" : ""} />
            {mismatch && <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => onSave(password)}
              disabled={saving || !password || password !== confirm || password.length < 6}
            >
              {saving ? "Guardando..." : "Cambiar Contraseña"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SetPinDialog({ open, onClose, user, onSave, saving, error }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => { if (open) { setPin(""); setConfirm(""); } }, [open]);

  const mismatch = confirm && pin !== confirm;
  const invalid = pin && !/^\d{4,6}$/.test(pin);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-orange-500" />
            PIN de Caja — {user?.fullName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            El PIN se usa para identificar al cajero al operar la caja. Solo vos como administrador podés setearlo.
          </p>
          <div>
            <Label>Nuevo PIN (4–6 dígitos)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
            />
            {invalid && <p className="text-xs text-red-500 mt-1">Solo números, entre 4 y 6 dígitos</p>}
          </div>
          <div>
            <Label>Confirmar PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value.replace(/\D/g, ""))}
              className={mismatch ? "border-red-400" : ""}
            />
            {mismatch && <p className="text-xs text-red-500 mt-1">Los PINs no coinciden</p>}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => onSave(pin)}
              disabled={saving || !pin || pin !== confirm || invalid}
            >
              {saving ? "Guardando..." : "Guardar PIN"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [pinUser, setPinUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    User.listAll().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    setSaving(true); setError("");
    try {
      await User.create(form.username, form.password, form.fullName, form.cargo);
      setShowCreate(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (form) => {
    setSaving(true); setError("");
    try {
      await User.updateUser(editUser.id, { fullName: form.fullName, username: form.username, cargo: form.cargo, isActive: editUser.isActive });
      setEditUser(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (password) => {
    setSaving(true); setError("");
    try {
      await User.resetPassword(resetUser.id, password);
      setResetUser(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    await User.updateUser(user.id, { fullName: user.fullName, cargo: user.cargo, isActive: !user.isActive });
    load();
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar a ${user.fullName || user.username}? Esta acción no se puede deshacer.`)) return;
    try {
      await User.deleteUser(user.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSetPin = async (pin) => {
    setSaving(true); setError("");
    try {
      await User.setPin(pinUser.id, pin);
      setPinUser(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-slate-400">Cargando...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-500" />Usuarios
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} usuario(s) registrado(s)</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { setError(""); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Usuario
        </Button>
      </div>

      <div className="space-y-3">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{u.fullName || "—"}</p>
                  <p className="text-xs text-slate-400 truncate">{u.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {u.role === "admin" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    <ShieldCheck className="h-3 w-3" />Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    <UserIcon className="h-3 w-3" />Empleado
                  </span>
                )}
                {u.isActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    <Power className="h-3 w-3" />Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                    <PowerOff className="h-3 w-3" />Inactivo
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <span>{u.cargo || "Sin cargo"}</span>
            </div>
            {u.role !== "admin" && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => { setError(""); setEditUser(u); }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 text-xs font-medium transition-colors"
                >
                  <Edit2 className="h-3 w-3" />Editar
                </button>
                <button
                  onClick={() => { setError(""); setResetUser(u); }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 text-xs font-medium transition-colors"
                >
                  <KeyRound className="h-3 w-3" />Contraseña
                </button>
                <button
                  onClick={() => { setError(""); setPinUser(u); }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 text-xs font-medium transition-colors"
                >
                  <Hash className="h-3 w-3" />PIN
                </button>
                <button
                  onClick={() => handleToggleActive(u)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    u.isActive
                      ? "bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600"
                      : "bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-700"
                  }`}
                >
                  {u.isActive ? <><PowerOff className="h-3 w-3" />Desactivar</> : <><Power className="h-3 w-3" />Activar</>}
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 text-xs font-medium transition-colors"
                >
                  <Trash2 className="h-3 w-3" />Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <UserFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} saving={saving} error={error} />
      <EditUserDialog open={!!editUser} onClose={() => setEditUser(null)} user={editUser} onSave={handleEdit} saving={saving} error={error} />
      <ResetPasswordDialog open={!!resetUser} onClose={() => setResetUser(null)} user={resetUser} onSave={handleResetPassword} saving={saving} error={error} />
      <SetPinDialog open={!!pinUser} onClose={() => setPinUser(null)} user={pinUser} onSave={handleSetPin} saving={saving} error={error} />
    </div>
  );
}
