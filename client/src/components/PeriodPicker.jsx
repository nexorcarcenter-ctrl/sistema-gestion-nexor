import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mesesDisponibles } from "@/entities/Report";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

// Selector de período: atajos relativos, un mes puntual, o un rango libre.
// Siempre devuelve { from, to } en YYYY-MM-DD; el resto de la app no
// necesita saber cuál de las tres formas se usó.
export default function PeriodPicker({ periodo, rango, onChange }) {
  const { t } = useLanguage();
  const esCustom = periodo === "custom";
  // Se calcula acá y no al importar el módulo: el idioma de moment
  // se configura en main.jsx, que corre después de los imports.
  const MESES = useMemo(() => mesesDisponibles(12), []);

  const elegirAtajo = (p) => {
    if (p === "custom") {
      const m = MESES[0];
      onChange({ periodo: "custom", rango: { from: m.from, to: m.to } });
    } else {
      onChange({ periodo: p, rango: null });
    }
  };

  const elegirMes = (valor) => {
    const m = MESES.find((x) => x.valor === valor);
    if (m) onChange({ periodo: "custom", rango: { from: m.from, to: m.to } });
  };

  const editarFecha = (campo, valor) => {
    if (!valor) return;
    const nuevo = { ...rango, [campo]: valor };
    // Si el usuario cruza las fechas, se corrige sola en vez de romper la consulta
    if (nuevo.from > nuevo.to) {
      if (campo === "from") nuevo.to = valor;
      else nuevo.from = valor;
    }
    onChange({ periodo: "custom", rango: nuevo });
  };

  // El mes queda seleccionado en el desplegable solo si el rango
  // coincide exactamente con ese mes completo
  const mesActivo = esCustom
    ? MESES.find((m) => m.from === rango?.from && m.to === rango?.to)?.valor || ""
    : "";

  return (
    <div className="flex flex-col items-end gap-2">
      <Tabs value={periodo} onValueChange={elegirAtajo}>
        <TabsList>
          <TabsTrigger value="today">{t("today")}</TabsTrigger>
          <TabsTrigger value="week">{t("thisWeek")}</TabsTrigger>
          <TabsTrigger value="month">{t("thisMonth")}</TabsTrigger>
          <TabsTrigger value="year">{t("thisYear")}</TabsTrigger>
          <TabsTrigger value="custom">{t("customPeriod")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {esCustom && (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={mesActivo}
            onChange={(e) => elegirMes(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 capitalize focus:outline-none focus:ring-2 focus:ring-[#E8461E]/30"
          >
            <option value="">{t("pickMonth")}</option>
            {MESES.map((m) => (
              <option key={m.valor} value={m.valor} className="capitalize">{m.etiqueta}</option>
            ))}
          </select>

          <span className="text-xs text-slate-400">{t("from")}</span>
          <input
            type="date"
            value={rango?.from || ""}
            max={rango?.to || undefined}
            onChange={(e) => editarFecha("from", e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#E8461E]/30"
          />
          <span className="text-xs text-slate-400">{t("to")}</span>
          <input
            type="date"
            value={rango?.to || ""}
            min={rango?.from || undefined}
            max={moment().format("YYYY-MM-DD")}
            onChange={(e) => editarFecha("to", e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#E8461E]/30"
          />
        </div>
      )}
    </div>
  );
}
