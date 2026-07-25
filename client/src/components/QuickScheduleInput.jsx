import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const SYSTEM_PROMPT = `Sos un asistente de un taller mecánico/electrónico de autos en Uruguay. 
Tu tarea es extraer información de un mensaje de texto libre para agendar una orden de servicio.
El año actual es ${new Date().getFullYear()}.
Extraé todos los datos que puedas del texto. Si no podés determinar un dato, dejalo vacío ("").
Para la fecha: interpretá expresiones como "15 de marzo" como ${new Date().getFullYear()}-03-15, "mañana", "el lunes", etc.
Para la hora: "09hs", "9 de la mañana", "14:30", etc. → formato HH:MM (24hs).
Para servicios: el nombre del trabajo principal (ej: "Colocación de radio", "Cambio de aceite").
Para notas: los productos, materiales o detalles adicionales mencionados (ej: "Quantum 9 pulgadas, Marco adaptador 5, interfaz 7").`;

export default function QuickScheduleInput({ onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleInterpret = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/ai/interpret-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result);
    setOpen(false);
    setText("");
    setResult(null);
  };

  const fieldLabel = (key) => ({
    entry_date: "📅 Fecha",
    appointment_time: "🕐 Hora",
    customer_name: "👤 Cliente",
    customer_phone: "📞 Teléfono",
    car_brand: "🚗 Marca",
    car_model: "🚗 Modelo",
    car_plate: "🔤 Patente",
    car_year: "📆 Año",
    service_name: "🔧 Servicio",
    notes: "📝 Notas/Materiales",
  }[key] || key);

  return (
    <div className="bg-gradient-to-r from-[#E8461E]/5 to-[#E8461E]/5 rounded-xl border border-orange-200 shadow-sm overflow-hidden">
      {/* Header toggle */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-[#E8461E]/5/80 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#E8461E]/10 rounded-xl flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#E8461E]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-orange-800 text-sm">Agendar con IA</p>
            <p className="text-xs text-[#E8461E]">Escribí en texto libre y la IA completa el formulario</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[#E8461E]" /> : <ChevronDown className="h-4 w-4 text-[#E8461E]" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#E8461E]/10">
          <div className="pt-3">
            <Textarea
              value={text}
              onChange={e => { setText(e.target.value); setResult(null); }}
              placeholder={"Ej: 15 de marzo 09hs.\nFiat Centra,\ncolocacion de radio\nQuantum 9 pulgadas\nMarco adaptador 5\ninterfaz 7"}
              rows={5}
              className="text-sm bg-white border-orange-200 focus:border-orange-400 resize-none"
            />
          </div>

          <Button
            onClick={handleInterpret}
            disabled={loading || !text.trim()}
            className="w-full bg-[#E8461E] hover:bg-[#c73a15] text-white"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Interpretando...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Interpretar con IA</>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-[#c73a15] uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />Datos interpretados — revisá antes de aplicar
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(result).map(([key, val]) => {
                  if (!val) return null;
                  return (
                    <div key={key} className={`bg-[#E8461E]/5 rounded-lg px-3 py-2 ${key === "notes" ? "col-span-2" : ""}`}>
                      <p className="text-[10px] text-[#E8461E] font-medium">{fieldLabel(key)}</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{val}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setResult(null)}>
                  Descartar
                </Button>
                <Button size="sm" className="flex-1 bg-[#E8461E] hover:bg-[#c73a15]" onClick={handleApply}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Aplicar al formulario
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}