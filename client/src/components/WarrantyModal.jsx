import { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Download, ShieldCheck, Pencil } from "lucide-react";

const BRAND_GREEN = [15, 118, 110];
const BRAND_GREEN_LIGHT = [153, 246, 228];
const BRAND_GREEN_BG = [240, 253, 250];

function generatePDF(fields) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, ML = 15, MR = 15, CW = W - ML - MR; // content width = 180mm
  let y = 0;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE GARANTÍA", W / 2, 13, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND_GREEN_LIGHT);
  doc.text(fields.workshopName, W / 2, 21, { align: "center" });
  y = 36;

  // ── Número de orden + Fecha ──────────────────────────────────────────────────
  const colW = (CW - 5) / 2;
  const drawCard = (x, cy, w, h, title, value, titleColor, valueColor, bgColor) => {
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, cy, w, h, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...titleColor);
    doc.text(title, x + 4, cy + 6);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...valueColor);
    doc.text(String(value), x + 4, cy + 14);
  };
  drawCard(ML, y, colW, 18, "N° DE ORDEN", fields.orderNumber, BRAND_GREEN, [21, 128, 61], BRAND_GREEN_BG);
  drawCard(ML + colW + 5, y, colW, 18, "FECHA DEL TRABAJO", fields.workDate, BRAND_GREEN, [21, 128, 61], BRAND_GREEN_BG);
  y += 24;

  // ── Sección helper ───────────────────────────────────────────────────────────
  const section = (title, lines) => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(ML, y, CW, 8 + lines.length * 6, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(ML, y, CW, 8 + lines.length * 6, 2, 2, "S");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_GREEN);
    doc.text(title.toUpperCase(), ML + 4, y + 5.5);
    let ly = y + 12;
    lines.forEach(([label, val]) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      if (label) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(label + ":", ML + 4, ly);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(String(val || "—"), ML + 45, ly);
      } else {
        doc.setFont("helvetica", "bold");
        doc.text(String(val || "—"), ML + 4, ly);
      }
      ly += 6;
    });
    y += 8 + lines.length * 6 + 5;
  };

  // ── Cliente ───────────────────────────────────────────────────────────────────
  section("Datos del Cliente", [
    ["Nombre", fields.customerName],
    ["Teléfono", fields.customerPhone],
  ]);

  // ── Vehículo ─────────────────────────────────────────────────────────────────
  section("Datos del Vehículo", [
    ["Vehículo", [fields.carBrand, fields.carModel, fields.carYear].filter(Boolean).join(" ")],
    ["Patente", fields.carPlate],
    ["Color", fields.carColor],
    ["Km ingreso", fields.carMileage ? `${Number(fields.carMileage).toLocaleString()} km` : "—"],
  ].filter(([, v]) => v));

  // ── Servicios ────────────────────────────────────────────────────────────────
  const serviceLines = fields.services
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => [null, `• ${s}`]);
  if (serviceLines.length === 0) serviceLines.push([null, "Sin servicios registrados"]);
  section("Trabajos Realizados", serviceLines);

  if (fields.extraNotes?.trim()) {
    section("Notas Adicionales", [[null, fields.extraNotes]]);
  }

  // ── Banner garantía ──────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_GREEN);
  doc.roundedRect(ML, y, CW, 20, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`✓  GARANTÍA DE ${fields.warrantyPeriod}`, W / 2, y + 9, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND_GREEN_LIGHT);
  doc.text(`Válida hasta el ${fields.warrantyExpiry}`, W / 2, y + 16, { align: "center" });
  y += 26;

  // ── Condiciones ──────────────────────────────────────────────────────────────
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(ML, y, CW, 34, 2, 2, "F");
  doc.setDrawColor(253, 224, 71);
  doc.roundedRect(ML, y, CW, 34, 2, 2, "S");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(133, 77, 14);
  doc.text("CONDICIONES DE GARANTÍA", ML + 4, y + 6);
  const conditions = [
    "• La garantía cubre defectos de instalación y materiales utilizados.",
    "• No cubre daños por mal uso, accidentes o modificaciones no autorizadas.",
    "• Para hacer válida la garantía presentar este certificado.",
    "• La garantía es personal e intransferible.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 63, 18);
  doc.setFontSize(8);
  conditions.forEach((c, i) => doc.text(c, ML + 4, y + 13 + i * 5.5));
  y += 40;

  // ── Firmas ───────────────────────────────────────────────────────────────────
  const sigW = (CW - 10) / 2;
  const sigH = 30;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(ML, y, sigW, sigH, 2, 2, "FD");
  doc.roundedRect(ML + sigW + 10, y, sigW, sigH, 2, 2, "FD");

  if (fields.clientSignature) {
    try {
      doc.addImage(fields.clientSignature, "PNG", ML + 2, y + 2, sigW - 4, sigH - 12);
    } catch (_) {}
  }
  if (fields.employeeSignature) {
    try {
      doc.addImage(fields.employeeSignature, "PNG", ML + sigW + 12, y + 2, sigW - 4, sigH - 12);
    } catch (_) {}
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(fields.customerName || "Cliente", ML + sigW / 2, y + sigH - 7, { align: "center" });
  doc.text("Firma del cliente", ML + sigW / 2, y + sigH - 3, { align: "center" });
  doc.text("Responsable del taller", ML + sigW + 10 + sigW / 2, y + sigH - 7, { align: "center" });
  doc.text("Firma y sello", ML + sigW + 10 + sigW / 2, y + sigH - 3, { align: "center" });
  y += sigH + 10;

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.line(ML, y, ML + CW, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_GREEN);
  doc.text("Gracias por confiar en nosotros", W / 2, y + 7, { align: "center" });

  doc.save(`garantia-${fields.orderNumber || "orden"}.pdf`);
}

export default function WarrantyModal({ order, onClose }) {
  const inspData = order.inspection_data ? JSON.parse(order.inspection_data) : null;
  const services = JSON.parse(order.services || "[]");
  const serviceText = services.map(s => {
    const prods = s.products?.map(p => `${p.product_name} x${p.quantity}`).join(", ");
    return prods ? `${s.service_name} (${prods})` : s.service_name;
  }).join("\n");

  const warrantyDate = order.delivery_date || order.entry_date || new Date().toISOString().split("T")[0];
  const expiryDate = new Date(warrantyDate + "T00:00:00");
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  const fmt = (d) => new Date(d).toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });

  const [fields, setFields] = useState({
    workshopName: "Taller de Instalación de Audio y Electrónica Automotriz",
    orderNumber: order.order_number || "",
    workDate: fmt(warrantyDate + "T00:00:00"),
    customerName: order.customer_name || "",
    customerPhone: order.customer_phone || "",
    carBrand: order.car_brand || "",
    carModel: order.car_model || "",
    carYear: order.car_year || "",
    carPlate: order.car_plate || "",
    carColor: order.car_color || "",
    carMileage: order.car_mileage || "",
    services: serviceText,
    extraNotes: order.notes || "",
    warrantyPeriod: "1 (UN) AÑO",
    warrantyExpiry: fmt(expiryDate),
    clientSignature: inspData?.signature || null,
    employeeSignature: inspData?.employeeSignature || null,
  });

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            <h2 className="font-bold text-slate-800">Certificado de Garantía</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Revisá y editá los datos antes de generar el PDF
          </p>

          {/* Taller */}
          <div className="space-y-1.5">
            <Label>Nombre del taller</Label>
            <Input value={fields.workshopName} onChange={set("workshopName")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>N° de orden</Label>
              <Input value={fields.orderNumber} onChange={set("orderNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha del trabajo</Label>
              <Input value={fields.workDate} onChange={set("workDate")} />
            </div>
          </div>

          {/* Cliente */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cliente</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={fields.customerName} onChange={set("customerName")} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={fields.customerPhone} onChange={set("customerPhone")} />
              </div>
            </div>
          </div>

          {/* Vehículo */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Vehículo</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input value={fields.carBrand} onChange={set("carBrand")} />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input value={fields.carModel} onChange={set("carModel")} />
              </div>
              <div className="space-y-1.5">
                <Label>Año</Label>
                <Input value={fields.carYear} onChange={set("carYear")} />
              </div>
              <div className="space-y-1.5">
                <Label>Patente</Label>
                <Input value={fields.carPlate} onChange={set("carPlate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Input value={fields.carColor} onChange={set("carColor")} />
              </div>
              <div className="space-y-1.5">
                <Label>Km</Label>
                <Input value={fields.carMileage} onChange={set("carMileage")} />
              </div>
            </div>
          </div>

          {/* Servicios */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Trabajos realizados</p>
            <div className="space-y-1.5">
              <Label>Un servicio por línea</Label>
              <Textarea value={fields.services} onChange={set("services")} rows={4} />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas adicionales (opcional)</Label>
            <Textarea value={fields.extraNotes} onChange={set("extraNotes")} rows={2}
              placeholder="Recomendaciones, observaciones, etc." />
          </div>

          {/* Garantía */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Garantía</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Input value={fields.warrantyPeriod} onChange={set("warrantyPeriod")} />
              </div>
              <div className="space-y-1.5">
                <Label>Válida hasta</Label>
                <Input value={fields.warrantyExpiry} onChange={set("warrantyExpiry")} />
              </div>
            </div>
          </div>

          {/* Firmas preview */}
          {(fields.clientSignature || fields.employeeSignature) && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Firmas (se incluyen en el PDF)</p>
              <div className="flex gap-4">
                {fields.clientSignature && (
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">Cliente</p>
                    <img src={fields.clientSignature} className="max-h-16 border border-slate-200 rounded bg-slate-50 w-full object-contain" />
                  </div>
                )}
                {fields.employeeSignature && (
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">Empleado</p>
                    <img src={fields.employeeSignature} className="max-h-16 border border-slate-200 rounded bg-slate-50 w-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => generatePDF(fields)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
