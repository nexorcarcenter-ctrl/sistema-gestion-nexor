import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "../context/LanguageContext";

const FUEL_TYPES = ["gasoline", "diesel", "electric", "hybrid", "lpg", "other"];
const TRANSMISSIONS = ["manual", "automatic", "cvt", "semi-automatic"];
const BODY_TYPES = ["sedan", "suv", "hatchback", "pickup", "van", "coupe", "convertible", "wagon", "other"];
const CONDITIONS = ["new", "used", "certified"];
const STATUSES = ["available", "reserved", "sold", "in_repair"];
const DOORS = [2, 3, 4, 5];

const EMPTY_FORM = {
  brand: "", model: "", year: new Date().getFullYear(), color: "",
  plate: "", vin: "", mileage: 0, fuel_type: "gasoline",
  transmission: "manual", engine_cc: "", doors: 4, body_type: "sedan",
  condition: "used", purchase_price: "", sale_price: "",
  supplier_name: "", status: "available", features: "", notes: "",
  entry_date: new Date().toISOString().split("T")[0],
};

export default function CarForm({ car, suppliers = [], onSave, onCancel, isSaving }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (car) {
      setForm({ ...EMPTY_FORM, ...car });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [car]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = () => {
    const data = {
      ...form,
      year: parseInt(form.year) || new Date().getFullYear(),
      mileage: parseFloat(form.mileage) || 0,
      engine_cc: parseFloat(form.engine_cc) || 0,
      doors: parseInt(form.doors) || 4,
      purchase_price: parseFloat(form.purchase_price) || 0,
      sale_price: parseFloat(form.sale_price) || 0,
    };
    onSave(data);
  };

  const SectionTitle = ({ label }) => (
    <div className="col-span-full border-b border-slate-200 pb-1 mb-1">
      <p className="text-xs font-semibold text-[#c73a15] uppercase tracking-wider">{label}</p>
    </div>
  );

  const Field = ({ label, children, required }) => (
    <div>
      <Label className="text-xs text-slate-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
    </div>
  );

  const selectClass = "h-9 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#E8461E]";

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        {/* Basic Info */}
        <SectionTitle label={t("carBasicInfo")} />
        <Field label={t("carBrand")} required><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Toyota, Ford..." /></Field>
        <Field label={t("carModel")} required><Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Corolla, F-150..." /></Field>
        <Field label={t("carYear")} required><Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} min="1900" max="2100" /></Field>
        <Field label={t("carColor")}><Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Blanco, Negro..." /></Field>
        <Field label={t("carPlate")}><Input value={form.plate} onChange={(e) => set("plate", e.target.value)} placeholder="ABC-1234" /></Field>
        <Field label={t("carVin")}><Input value={form.vin} onChange={(e) => set("vin", e.target.value)} placeholder="1HGBH41JXMN109186" /></Field>
        <Field label={t("carEntryDate")}><Input type="date" value={form.entry_date} onChange={(e) => set("entry_date", e.target.value)} /></Field>
        <Field label={t("carMileage")}><Input type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} min="0" placeholder="0" /></Field>

        {/* Technical Specs */}
        <SectionTitle label={t("carTechnical")} />
        <Field label={t("carFuelType")}>
          <select className={selectClass} value={form.fuel_type} onChange={(e) => set("fuel_type", e.target.value)}>
            {FUEL_TYPES.map((f) => <option key={f} value={f}>{t("fuel_" + f)}</option>)}
          </select>
        </Field>
        <Field label={t("carTransmission")}>
          <select className={selectClass} value={form.transmission} onChange={(e) => set("transmission", e.target.value)}>
            {TRANSMISSIONS.map((tr) => <option key={tr} value={tr}>{t("trans_" + tr)}</option>)}
          </select>
        </Field>
        <Field label={t("carBodyType")}>
          <select className={selectClass} value={form.body_type} onChange={(e) => set("body_type", e.target.value)}>
            {BODY_TYPES.map((b) => <option key={b} value={b}>{t("body_" + b)}</option>)}
          </select>
        </Field>
        <Field label={t("carDoors")}>
          <select className={selectClass} value={form.doors} onChange={(e) => set("doors", e.target.value)}>
            {DOORS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label={t("carEngine")}><Input type="number" value={form.engine_cc} onChange={(e) => set("engine_cc", e.target.value)} placeholder="1600" min="0" /></Field>

        {/* Commercial */}
        <SectionTitle label={t("carCommercial")} />
        <Field label={t("carCondition")}>
          <select className={selectClass} value={form.condition} onChange={(e) => set("condition", e.target.value)}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{t("cond_" + c)}</option>)}
          </select>
        </Field>
        <Field label={t("carStatus")}>
          <select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{t("carStatus_" + s)}</option>)}
          </select>
        </Field>
        <Field label={t("carPurchasePrice")}><Input type="number" value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} min="0" placeholder="0.00" /></Field>
        <Field label={t("carSalePrice")}><Input type="number" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} min="0" placeholder="0.00" /></Field>
        <Field label={t("supplier")}>
          {suppliers.length > 0 ? (
            <select className={selectClass} value={form.supplier_name} onChange={(e) => set("supplier_name", e.target.value)}>
              <option value="">— {t("selectSupplier")} —</option>
              {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          ) : (
            <Input value={form.supplier_name} onChange={(e) => set("supplier_name", e.target.value)} placeholder={t("companyName")} />
          )}
        </Field>

        {/* Notes */}
        <SectionTitle label={t("carExtras")} />
        <div className="col-span-full">
          <Field label={t("carFeatures")}><Input value={form.features} onChange={(e) => set("features", e.target.value)} placeholder="A/C, ABS, Airbags, GPS..." /></Field>
        </div>
        <div className="col-span-full">
          <Field label={t("notes")}><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder={t("carNotesPlaceholder")} /></Field>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button variant="outline" onClick={onCancel}>{t("cancel")}</Button>
        <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={handleSubmit} disabled={!form.brand || !form.model || !form.year || isSaving}>
          {isSaving ? t("loading") : t("save")}
        </Button>
      </div>
    </div>
  );
}