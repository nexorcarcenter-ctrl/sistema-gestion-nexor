import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Appointment } from "@/entities/Appointment";
import { ServiceType } from "@/entities/ServiceType";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, User, Phone,
  Car, Wrench, FileText, CheckCircle, AlertCircle, XCircle, Calendar, Search, Check, ClipboardList
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const DAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Slots de 30 min: 9-13 y 14-18
const TIME_SLOTS = [];
for (let h = 9; h < 13; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}
for (let h = 14; h < 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}
TIME_SLOTS.push("18:00");

const STATUS_CONFIG = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-100 text-amber-700",  icon: AlertCircle },
  confirmado:  { label: "Confirmado",  color: "bg-green-100 text-green-700",  icon: CheckCircle },
  cancelado:   { label: "Cancelado",   color: "bg-red-100 text-red-600",      icon: XCircle },
};

const TYPE_CONFIG = {
  turno:        { label: "Turno",        dot: "bg-orange-400" },
  recordatorio: { label: "Recordatorio", dot: "bg-blue-400" },
};

// domingo=0 en JS → mapeamos a índice 6 para que Do quede último
function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // lunes=0 ... domingo=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days = [];
  // días del mes anterior
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, current: false });
  }
  // días del mes actual
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), current: true });
  }
  // completar hasta 42 celdas
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - startDow - lastDay.getDate() + 1);
    days.push({ date: d, current: false });
  }
  return days;
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSunday(date) {
  return date.getDay() === 0;
}

// ─── Selector de tipo de servicio ─────────────────────────────────────────────
function ServiceTypeSelector({ value, onChange, onClose }) {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    ServiceType.list("name").then(data => {
      setServiceTypes(data.filter(s => s.status === "active"));
      setLoading(false);
    });
  }, []);

  const filtered = serviceTypes.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNew = async () => {
    if (!newName.trim()) return;
    setSavingNew(true);
    const created = await ServiceType.create({ name: newName.trim(), status: "active" });
    setServiceTypes(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(newName.trim());
    setSavingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h4 className="font-semibold text-slate-800 text-sm">Seleccionar Servicio</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar servicio..."
              className="pl-9 text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <p className="text-center text-sm text-slate-400 py-6">Cargando...</p>
          ) : filtered.length === 0 && !adding ? (
            <p className="text-center text-sm text-slate-400 py-6">No se encontraron servicios</p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onChange(s.name); onClose(); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    value === s.name ? "bg-orange-50 text-orange-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{s.name}</span>
                  {value === s.name && <Check className="h-4 w-4 text-orange-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-3">
          {adding ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre del servicio"
                className="text-sm flex-1"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleAddNew()}
              />
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={handleAddNew} disabled={savingNew || !newName.trim()}>
                {savingNew ? "..." : "Crear"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewName(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium w-full py-1"
            >
              <Plus className="h-4 w-4" />Agregar nuevo servicio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Formulario ───────────────────────────────────────────────────────────────
function AppointmentForm({ initialDate, initialTime, appointment, prefill, onSave, onDelete, onReschedule, onClose, saving }) {
  const navigate = useNavigate();
  const pf = prefill || {};
  const [type, setType] = useState(pf.type || appointment?.type || "turno");
  const [date, setDate] = useState(appointment?.date || initialDate || "");
  const [time, setTime] = useState(appointment?.time || initialTime || "09:00");
  const [status, setStatus] = useState(appointment?.status || "pendiente");
  const [customerName, setCustomerName] = useState(pf.customerName || appointment?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(pf.customerPhone || appointment?.customerPhone || "");
  const [carPlate, setCarPlate] = useState(pf.carPlate || appointment?.carPlate || "");
  const [carBrand, setCarBrand] = useState(pf.carBrand || appointment?.carBrand || "");
  const [carModel, setCarModel] = useState(pf.carModel || appointment?.carModel || "");
  const [serviceDescription, setServiceDescription] = useState(pf.serviceDescription || appointment?.serviceDescription || "");
  const [notes, setNotes] = useState(pf.notes || appointment?.notes || "");

  const [showServicePicker, setShowServicePicker] = useState(false);

  const isEditing = !!appointment;
  const isRescheduling = !!pf.originalId;
  const canSave = date && time && (type === "recordatorio" ? serviceDescription.trim() : customerName.trim());

  const handleSubmit = () => {
    onSave({
      type, date, time, status,
      customer_name: customerName,
      customer_phone: customerPhone,
      car_plate: carPlate.toUpperCase(),
      car_brand: carBrand,
      car_model: carModel,
      service_description: serviceDescription,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{isRescheduling ? "Reagendar" : isEditing ? "Editar" : "Nuevo"} {type === "turno" ? "Turno" : "Recordatorio"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            <button
              onClick={() => setType("turno")}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${type === "turno" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"}`}
            >Turno</button>
            <button
              onClick={() => setType("recordatorio")}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${type === "recordatorio" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
            >Recordatorio</button>
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />Fecha *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Hora *</Label>
              <select
                value={time}
                onChange={e => setTime(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Descripción / Servicio */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Wrench className="h-3 w-3" />{type === "turno" ? "Servicio" : "Título *"}
            </Label>
            {type === "turno" ? (
              <button
                type="button"
                onClick={() => setShowServicePicker(true)}
                className={`mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-left flex items-center justify-between transition-colors hover:bg-slate-50 ${
                  serviceDescription ? "text-slate-800" : "text-slate-400"
                }`}
              >
                <span className="truncate">{serviceDescription || "Seleccionar servicio..."}</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              </button>
            ) : (
              <Input
                value={serviceDescription}
                onChange={e => setServiceDescription(e.target.value)}
                className="mt-1"
                placeholder="Ej: Llamar a proveedor, pagar factura..."
              />
            )}
          </div>

          {/* Datos del cliente — solo turno */}
          {type === "turno" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" />Cliente *</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1" placeholder="Nombre" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />Teléfono</Label>
                  <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="mt-1" placeholder="09x xxx xxx" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Car className="h-3 w-3" />Patente</Label>
                  <Input value={carPlate} onChange={e => setCarPlate(e.target.value)} className="mt-1 uppercase" placeholder="ABC 1234" />
                </div>
                <div>
                  <Label className="text-xs">Marca</Label>
                  <Input value={carBrand} onChange={e => setCarBrand(e.target.value)} className="mt-1" placeholder="Toyota" />
                </div>
                <div>
                  <Label className="text-xs">Modelo</Label>
                  <Input value={carModel} onChange={e => setCarModel(e.target.value)} className="mt-1" placeholder="Corolla" />
                </div>
              </div>
            </>
          )}

          {/* Notas */}
          <div>
            <Label className="text-xs flex items-center gap-1"><FileText className="h-3 w-3" />Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 text-sm" placeholder="Observaciones adicionales..." />
          </div>

          {/* Estado — solo al editar */}
          {isEditing && (
            <div>
              <Label className="text-xs">Estado</Label>
              <div className="flex gap-2 mt-1">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${status === key ? cfg.color + " border-current" : "bg-white text-slate-500 border-slate-200"}`}
                  >{cfg.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 p-5 border-t border-slate-100">
          {isEditing && type === "turno" && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                const params = new URLSearchParams();
                if (customerName) params.set("customer_name", customerName);
                if (customerPhone) params.set("customer_phone", customerPhone);
                if (carPlate) params.set("car_plate", carPlate);
                if (carBrand) params.set("car_brand", carBrand);
                if (carModel) params.set("car_model", carModel);
                if (serviceDescription) params.set("service_description", serviceDescription);
                if (date) params.set("entry_date", date);
                if (time) params.set("appointment_time", time);
                if (notes) params.set("notes", notes);
                onClose();
                navigate(`/new-service-order?${params.toString()}`);
              }}
            >
              <ClipboardList className="h-4 w-4 mr-2" />Generar Orden de Servicio
            </Button>
          )}
          <div className="flex gap-2">
            {isEditing && (
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={onDelete} disabled={saving}>
                Eliminar
              </Button>
            )}
            {isEditing && (
              <Button variant="outline" onClick={onReschedule} disabled={saving}>
                Reagendar
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !canSave}
              className={`flex-1 ${type === "turno" ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-500 hover:bg-blue-600"}`}
            >
              {saving ? "Guardando..." : isRescheduling ? "Reagendar" : isEditing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      </div>

      {showServicePicker && (
        <ServiceTypeSelector
          value={serviceDescription}
          onChange={setServiceDescription}
          onClose={() => setShowServicePicker(false)}
        />
      )}
    </div>
  );
}

// ─── Panel de día expandido ───────────────────────────────────────────────────
function DayPanel({ date, appointments, onClose, onNewAtTime, onEditAppointment }) {
  const dateStr = toDateStr(date);
  const dayName = date.toLocaleDateString("es-UY", { weekday: "long" });
  const dayLabel = date.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
  const closed = isSunday(date);

  const apptByTime = appointments.reduce((acc, a) => {
    if (!acc[a.time]) acc[a.time] = [];
    acc[a.time].push(a);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <p className="font-bold text-slate-800 capitalize">{dayName}</p>
          <p className="text-xs text-slate-400 capitalize">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {!closed && (
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => onNewAtTime(dateStr, "09:00")}>
              <Plus className="h-3.5 w-3.5 mr-1" />Agregar
            </Button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {closed ? (
        <div className="px-5 py-10 text-center text-slate-400">
          <p className="text-sm font-medium">Taller cerrado los domingos</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
          {/* Bloque mañana */}
          <div className="px-5 py-2 bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Mañana · 9:00 – 13:00</p>
          </div>
          {TIME_SLOTS.filter(t => t >= "09:00" && t < "13:00").map(slot => (
            <TimeSlotRow key={slot} slot={slot} appointments={apptByTime[slot] || []} dateStr={dateStr} onNew={onNewAtTime} onEdit={onEditAppointment} />
          ))}

          {/* Corte */}
          <div className="px-5 py-2 bg-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Corte · 13:00 – 14:00</p>
          </div>

          {/* Bloque tarde */}
          <div className="px-5 py-2 bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tarde · 14:00 – 18:00</p>
          </div>
          {TIME_SLOTS.filter(t => t >= "14:00" && t <= "18:00").map(slot => (
            <TimeSlotRow key={slot} slot={slot} appointments={apptByTime[slot] || []} dateStr={dateStr} onNew={onNewAtTime} onEdit={onEditAppointment} />
          ))}
        </div>
      )}
    </div>
  );
}

function TimeSlotRow({ slot, appointments, dateStr, onNew, onEdit }) {
  return (
    <div className="flex gap-3 px-5 py-2 hover:bg-slate-50/50 group min-h-[44px]">
      <div className="w-12 flex-shrink-0 pt-0.5">
        <span className="text-xs text-slate-400 font-medium">{slot}</span>
      </div>
      <div className="flex-1 space-y-1">
        {appointments.map(a => (
          <button
            key={a.id}
            onClick={() => onEdit(a)}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 ${
              a.type === "turno" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
            } ${a.status === "cancelado" ? "opacity-50 line-through" : ""}`}
          >
            <span className="font-semibold">
              {a.type === "turno" ? (a.customerName || a.customer_name || "—") : (a.serviceDescription || a.service_description || "Recordatorio")}
            </span>
            {a.type === "turno" && (a.serviceDescription || a.service_description) && (
              <span className="text-orange-600"> · {a.serviceDescription || a.service_description}</span>
            )}
            {(a.carPlate || a.car_plate) && (
              <span className="text-orange-500"> · {a.carPlate || a.car_plate}</span>
            )}
          </button>
        ))}
      </div>
      {appointments.length === 0 && (
        <button
          onClick={() => onNew(dateStr, slot)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-orange-400 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AgendaPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formState, setFormState] = useState(null); // null | { initialDate, initialTime, appointment }
  const [saving, setSaving] = useState(false);

  const todayStr = toDateStr(today);
  const grid = getMonthGrid(year, month);

  const loadAppointments = async () => {
    setLoading(true);
    const data = await Appointment.list("-date", 1000);
    setAppointments(data);
    setLoading(false);
  };

  useEffect(() => { loadAppointments(); }, []);

  const apptByDate = appointments.reduce((acc, a) => {
    const d = a.date?.split("T")[0] || a.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const handleDayClick = (date) => {
    const str = toDateStr(date);
    setSelectedDate(selectedDate === str ? null : str);
  };

  const handleNewAtTime = (dateStr, time) => {
    setFormState({ initialDate: dateStr, initialTime: time, appointment: null });
  };

  const handleEditAppointment = (appt) => {
    setFormState({ initialDate: appt.date, initialTime: appt.time, appointment: appt });
  };

  const handleSave = async (data) => {
    setSaving(true);
    if (formState.appointment) {
      await Appointment.update(formState.appointment.id, data);
    } else {
      // Si es reagendamiento, cancelar el turno original
      if (formState.prefill?.originalId) {
        await Appointment.update(formState.prefill.originalId, { status: "cancelado" });
      }
      await Appointment.create(data);
    }
    await loadAppointments();
    setFormState(null);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!formState.appointment) return;
    setSaving(true);
    await Appointment.delete(formState.appointment.id);
    await loadAppointments();
    setFormState(null);
    setSaving(false);
  };

  const handleReschedule = () => {
    if (!formState?.appointment) return;
    const appt = formState.appointment;
    // Abre formulario nuevo con los mismos datos pero fecha/hora para elegir de nuevo
    setFormState({
      initialDate: todayStr,
      initialTime: "09:00",
      appointment: null,
      prefill: {
        type: appt.type,
        customerName: appt.customerName || appt.customer_name || "",
        customerPhone: appt.customerPhone || appt.customer_phone || "",
        carPlate: appt.carPlate || appt.car_plate || "",
        carBrand: appt.carBrand || appt.car_brand || "",
        carModel: appt.carModel || appt.car_model || "",
        serviceDescription: appt.serviceDescription || appt.service_description || "",
        notes: appt.notes || "",
        originalId: appt.id,
      },
    });
  };

  const selectedDateObj = selectedDate ? new Date(selectedDate + "T12:00:00") : null;
  const selectedAppts = selectedDate ? (apptByDate[selectedDate] || []).sort((a, b) => a.time.localeCompare(b.time)) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
          <p className="text-sm text-slate-500">Turnos y recordatorios del taller</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setFormState({ initialDate: todayStr, initialTime: "09:00", appointment: null })}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Turno
        </Button>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Nav de mes */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <h2 className="font-bold text-slate-800 text-lg">
            {MONTHS_ES[month]} {year}
          </h2>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Headers días */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAYS_ES.map(d => (
            <div key={d} className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide ${d === "Do" ? "text-red-400" : "text-slate-400"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Cargando...</div>
        ) : (
          <div className="grid grid-cols-7">
            {grid.map(({ date, current }, idx) => {
              const str = toDateStr(date);
              const isToday = str === todayStr;
              const isSelected = str === selectedDate;
              const sunday = isSunday(date);
              const dayAppts = apptByDate[str] || [];
              const hasTurnos = dayAppts.some(a => a.type === "turno");
              const hasRecordatorios = dayAppts.some(a => a.type === "recordatorio");

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(date)}
                  className={`relative flex flex-col items-center pt-2 pb-3 min-h-[72px] border-b border-r border-slate-100 transition-colors last:border-r-0
                    ${!current ? "bg-slate-50/50" : ""}
                    ${sunday ? "bg-red-50/30" : ""}
                    ${isSelected ? "bg-orange-50" : "hover:bg-slate-50"}
                  `}
                >
                  {/* Número del día */}
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                    ${isToday ? "bg-orange-500 text-white font-bold" : ""}
                    ${isSelected && !isToday ? "bg-orange-100 text-orange-700" : ""}
                    ${!isToday && !isSelected && current ? "text-slate-700" : ""}
                    ${!current ? "text-slate-300" : ""}
                    ${sunday && current && !isToday ? "text-red-400" : ""}
                  `}>
                    {date.getDate()}
                  </span>

                  {/* Dots de appointments */}
                  {dayAppts.length > 0 && (
                    <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center px-1">
                      {hasTurnos && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />}
                      {hasRecordatorios && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                      {dayAppts.length > 1 && (
                        <span className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">{dayAppts.length}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Leyenda */}
        <div className="flex items-center gap-4 px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />Turno
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />Recordatorio
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-200" />Cerrado
          </div>
        </div>
      </div>

      {/* Panel del día seleccionado */}
      {selectedDate && selectedDateObj && (
        <DayPanel
          date={selectedDateObj}
          appointments={selectedAppts}
          onClose={() => setSelectedDate(null)}
          onNewAtTime={handleNewAtTime}
          onEditAppointment={handleEditAppointment}
        />
      )}

      {/* Modal de formulario */}
      {formState && (
        <AppointmentForm
          initialDate={formState.initialDate}
          initialTime={formState.initialTime}
          appointment={formState.appointment}
          prefill={formState.prefill}
          onSave={handleSave}
          onDelete={handleDelete}
          onReschedule={handleReschedule}
          onClose={() => setFormState(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
