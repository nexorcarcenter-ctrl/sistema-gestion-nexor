import { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Download, ShieldCheck, Pencil } from "lucide-react";

const ORANGE = [232, 70, 30];
const ORANGE_LIGHT = [251, 229, 223];
const BLACK = [13, 13, 15];
const GRAY_TEXT = [100, 116, 139];
const GRAY_BG = [248, 250, 252];
const GRAY_BORDER = [226, 232, 240];
const WHITE = [255, 255, 255];

const WARRANTY_OPTIONS = [
  { label: "3 Meses", value: "3m", months: 3, display: "3 Meses" },
  { label: "6 Meses", value: "6m", months: 6, display: "6 Meses" },
  { label: "1 Año", value: "1y", months: 12, display: "1 Año" },
];

function drawWatermarkN(doc) {
  const x = 140, y = 120, scale = 3.2;
  doc.setGlobalAlpha && doc.setGlobalAlpha(0.04);
  doc.setFillColor(200, 200, 200);
  // Simplified N shape as two parallelograms
  // Left vertical bar
  doc.rect(x, y, 5 * scale, 40 * scale, "F");
  // Right vertical bar
  doc.rect(x + 25 * scale, y, 5 * scale, 40 * scale, "F");
  // Diagonal
  doc.triangle(
    x + 5 * scale, y,
    x + 25 * scale, y + 40 * scale,
    x + 30 * scale, y + 40 * scale,
    "F"
  );
  doc.triangle(
    x + 5 * scale, y,
    x + 10 * scale, y,
    x + 30 * scale, y + 40 * scale,
    "F"
  );
  doc.setGlobalAlpha && doc.setGlobalAlpha(1);
}

function generatePDF(fields) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, ML = 18, MR = 18, CW = W - ML - MR;
  let y = 15;

  // ── NEXOR Logo (text-based) ──────────────────────────────────────────
  // Orange square icon
  doc.setFillColor(...ORANGE);
  doc.roundedRect(ML, y - 2, 10, 10, 1.5, 1.5, "F");
  // N letter inside
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("N", ML + 3, y + 5.5);
  // NEXOR text
  doc.setTextColor(...BLACK);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("NEXOR", ML + 13, y + 5.5);
  y += 18;

  // ── Title ────────────────────────────────────────────────────────────
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("Póliza de garantía - Nexor", ML, y);
  y += 10;

  // ── Intro paragraph ──────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const intro = "En Nexor, nos comprometemos con la excelencia técnica y la satisfacción total de nuestros clientes. Esta póliza detalla los términos de cobertura para la adquisición de equipos y servicios de instalación.";
  const introLines = doc.splitTextToSize(intro, CW);
  doc.text(introLines, ML + 8, y);
  y += introLines.length * 5 + 6;

  // ── Dynamic: Order & Customer Info ───────────────────────────────────
  if (fields.orderNumber || fields.customerName) {
    doc.setFillColor(...GRAY_BG);
    doc.setDrawColor(...GRAY_BORDER);
    const infoH = 28;
    doc.roundedRect(ML, y, CW, infoH, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ORANGE);
    doc.text("DATOS DE LA ORDEN", ML + 4, y + 5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY_TEXT);
    let iy = y + 11;
    const infoCol1 = ML + 4;
    const infoCol2 = ML + CW / 2 + 4;

    if (fields.orderNumber) {
      doc.text("Orden:", infoCol1, iy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      doc.text(fields.orderNumber, infoCol1 + 20, iy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY_TEXT);
    }
    if (fields.workDate) {
      doc.text("Fecha:", infoCol2, iy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      doc.text(fields.workDate, infoCol2 + 20, iy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY_TEXT);
    }
    iy += 6;
    if (fields.customerName) {
      doc.text("Cliente:", infoCol1, iy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      doc.text(fields.customerName, infoCol1 + 20, iy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY_TEXT);
    }
    if (fields.customerPhone) {
      doc.text("Tel:", infoCol2, iy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      doc.text(fields.customerPhone, infoCol2 + 20, iy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY_TEXT);
    }
    iy += 6;
    const vehicleStr = [fields.carBrand, fields.carModel, fields.carYear].filter(Boolean).join(" ");
    if (vehicleStr) {
      doc.text("Vehículo:", infoCol1, iy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      doc.text(vehicleStr, infoCol1 + 20, iy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY_TEXT);
    }
    if (fields.carPlate) {
      doc.text("Patente:", infoCol2, iy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      doc.text(fields.carPlate, infoCol2 + 20, iy);
    }

    y += infoH + 5;
  }

  // ── Dynamic: Services ────────────────────────────────────────────────
  if (fields.services?.trim()) {
    const svcLines = fields.services.split("\n").filter(s => s.trim());
    const svcH = 10 + svcLines.length * 5;
    doc.setFillColor(...GRAY_BG);
    doc.setDrawColor(...GRAY_BORDER);
    doc.roundedRect(ML, y, CW, svcH, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ORANGE);
    doc.text("TRABAJOS REALIZADOS", ML + 4, y + 5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    svcLines.forEach((line, i) => {
      doc.text(`•  ${line.trim()}`, ML + 4, y + 11 + i * 5);
    });
    y += svcH + 5;
  }

  // ── Coverage Table ───────────────────────────────────────────────────
  const tableX = ML;
  const colWidths = [CW * 0.32, CW * 0.22, CW * 0.46];
  const rowH = 18;
  const headerH = 10;

  // Table header
  doc.setFillColor(...ORANGE);
  doc.roundedRect(tableX, y, CW, headerH, 1.5, 1.5, "F");
  // Cover bottom corners of header
  doc.rect(tableX, y + headerH - 2, CW, 2, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Cobertura", tableX + 5, y + 6.5);
  doc.text("Plazo", tableX + colWidths[0] + 5, y + 6.5);
  doc.text("Detalles", tableX + colWidths[0] + colWidths[1] + 5, y + 6.5);
  y += headerH;

  // Row 1: Garantía General
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...GRAY_BORDER);
  doc.rect(tableX, y, CW, rowH, "FD");
  // Vertical lines
  doc.line(tableX + colWidths[0], y, tableX + colWidths[0], y + rowH);
  doc.line(tableX + colWidths[0] + colWidths[1], y, tableX + colWidths[0] + colWidths[1], y + rowH);

  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Garantía General", tableX + 5, y + 10);
  doc.setFont("helvetica", "normal");
  doc.text(fields.warrantyDisplay, tableX + colWidths[0] + 5, y + 10);
  const detailLines1 = doc.splitTextToSize("Cubre defectos de fabricación en materiales y mano de obra de instalación", colWidths[2] - 10);
  doc.text(detailLines1, tableX + colWidths[0] + colWidths[1] + 5, y + 7);
  y += rowH;

  // Row 2: Protección al consumidor
  doc.setFillColor(252, 250, 248);
  doc.rect(tableX, y, CW, rowH, "FD");
  doc.line(tableX + colWidths[0], y, tableX + colWidths[0], y + rowH);
  doc.line(tableX + colWidths[0] + colWidths[1], y, tableX + colWidths[0] + colWidths[1], y + rowH);

  doc.setFont("helvetica", "bold");
  doc.text("Protección al consumidor", tableX + 5, y + 10);
  doc.setFont("helvetica", "normal");
  doc.text("5 Días\ncorridos", tableX + colWidths[0] + 5, y + 8);
  const detailLines2 = doc.splitTextToSize("Derecho a cambio o devolución por fallas críticas de origen (Ley de Protección al consumidor)", colWidths[2] - 10);
  doc.text(detailLines2, tableX + colWidths[0] + colWidths[1] + 5, y + 6);
  y += rowH + 8;

  // ── Section 1: Alcance ───────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("1.  Alcance de la Garantía", ML, y);
  y += 7;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const alcance = [
    "Reparación o reemplazo sin costo de radios y accesorios que presenten fallas de fábrica durante el período de garantía.",
    "Corrección técnica de cualquier inconveniente derivado directamente de la instalación realizada por nuestro personal.",
    "El plazo máximo de resolución para reclamos técnicos es de 30 días hábiles.",
  ];
  alcance.forEach(item => {
    const lines = doc.splitTextToSize(item, CW - 10);
    doc.text("●", ML + 2, y);
    doc.text(lines, ML + 8, y);
    y += lines.length * 4.5 + 2.5;
  });
  y += 4;

  // ── Section 2: Exclusiones ───────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("2.  Exclusiones (Anulación de Garantía)", ML, y);
  y += 7;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const exclIntro = "La garantía quedará sin efecto bajo las siguientes circunstancias:";
  doc.text(exclIntro, ML, y);
  y += 6;

  const exclusions = [
    ["Intervención de Terceros", "Cualquier intento de reparación, ajuste o modificación del cableado por personal ajeno a Nexor."],
    ["Mal Uso", "Daños por negligencia, accidentes, o exposición a condiciones extremas (humedad, filtraciones o calor excesivo)."],
    ["Alteraciones", "Instalación de software no oficial o modificaciones en el sistema operativo de las radios que afecten su rendimiento."],
  ];
  exclusions.forEach(([title, desc]) => {
    const fullText = `${title}: ${desc}`;
    const lines = doc.splitTextToSize(fullText, CW - 10);
    doc.text("●", ML + 2, y);
    // Bold title
    doc.setFont("helvetica", "bold");
    doc.text(title + ":", ML + 8, y);
    // Normal description
    const titleW = doc.getTextWidth(title + ": ");
    doc.setFont("helvetica", "normal");
    // Re-render full wrapped text
    const wrappedLines = doc.splitTextToSize(fullText, CW - 10);
    // Clear and redraw properly
    doc.setFont("helvetica", "normal");
    wrappedLines.forEach((line, li) => {
      if (li === 0) {
        // First line: bold title + normal rest
        doc.setFont("helvetica", "bold");
        doc.text(`${title}: `, ML + 8, y);
        doc.setFont("helvetica", "normal");
        const rest = line.substring(title.length + 2);
        if (rest) doc.text(rest, ML + 8 + titleW, y);
      } else {
        doc.text(line, ML + 8, y + li * 4.5);
      }
    });
    y += wrappedLines.length * 4.5 + 2.5;
  });
  y += 4;

  // ── Section 3: Procedimiento ─────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("3.  Procedimiento para Reclamos", ML, y);
  y += 7;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const procedimiento = [
    "Presentar el comprobante de compra (físico o digital) en nuestro local.",
    "El equipo técnico realizará una evaluación preliminar para determinar el origen de la falla.",
  ];
  procedimiento.forEach((item, i) => {
    doc.text(`${i + 1}.`, ML + 2, y);
    const lines = doc.splitTextToSize(item, CW - 10);
    doc.text(lines, ML + 8, y);
    y += lines.length * 4.5 + 2;
  });
  // WhatsApp line with bold number
  doc.text("3.", ML + 2, y);
  doc.text("Canal exclusivo de atención: ", ML + 8, y);
  const waPrefix = doc.getTextWidth("Canal exclusivo de atención: ");
  doc.setFont("helvetica", "bold");
  doc.text("WhatsApp 096 650 277.", ML + 8 + waPrefix, y);
  y += 10;

  // ── Signatures (if available) ────────────────────────────────────────
  if (fields.clientSignature || fields.employeeSignature) {
    const sigW = (CW - 10) / 2;
    const sigH = 25;

    doc.setDrawColor(...GRAY_BORDER);
    doc.setFillColor(...GRAY_BG);
    doc.roundedRect(ML, y, sigW, sigH, 2, 2, "FD");
    doc.roundedRect(ML + sigW + 10, y, sigW, sigH, 2, 2, "FD");

    if (fields.clientSignature) {
      try { doc.addImage(fields.clientSignature, "PNG", ML + 2, y + 1, sigW - 4, sigH - 10); } catch (_) {}
    }
    if (fields.employeeSignature) {
      try { doc.addImage(fields.employeeSignature, "PNG", ML + sigW + 12, y + 1, sigW - 4, sigH - 10); } catch (_) {}
    }

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY_TEXT);
    doc.text(fields.customerName || "Cliente", ML + sigW / 2, y + sigH - 6, { align: "center" });
    doc.text("Firma del cliente", ML + sigW / 2, y + sigH - 2.5, { align: "center" });
    doc.text("Responsable del taller", ML + sigW + 10 + sigW / 2, y + sigH - 6, { align: "center" });
    doc.text("Firma y sello", ML + sigW + 10 + sigW / 2, y + sigH - 2.5, { align: "center" });
    y += sigH + 6;
  }

  // ── Footer ───────────────────────────────────────────────────────────
  doc.setDrawColor(...GRAY_BORDER);
  doc.line(ML, y, ML + CW, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("Horarios de Atención:", ML, y);
  y += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY_TEXT);
  doc.text("Lunes a Viernes: 09:00 a 18:00 hs.", ML, y); y += 3.5;
  doc.text("Sábados: 09:00 a 13:00 hs.", ML, y); y += 3.5;
  doc.setTextColor(...BLACK);
  doc.text("Nexor - Especialistas en Instalaciones Multimedia.", ML, y);

  // ── Save ─────────────────────────────────────────────────────────────
  doc.save(`garantia-${fields.orderNumber || "nexor"}-${fields.warrantyValue}.pdf`);
}

export default function WarrantyModal({ order, onClose }) {
  const inspData = order.inspection_data ? JSON.parse(order.inspection_data) : null;
  const services = JSON.parse(order.services || "[]");
  const serviceText = services.map(s => {
    const prods = s.products?.map(p => `${p.product_name} x${p.quantity}`).join(", ");
    return prods ? `${s.service_name} (${prods})` : s.service_name;
  }).join("\n");

  const warrantyDate = order.delivery_date || order.entry_date || new Date().toISOString().split("T")[0];
  const fmt = (d) => new Date(d).toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });

  const calcExpiry = (months) => {
    const d = new Date(warrantyDate + "T00:00:00");
    d.setMonth(d.getMonth() + months);
    return fmt(d);
  };

  const [warrantyOption, setWarrantyOption] = useState("1y");
  const selectedOption = WARRANTY_OPTIONS.find(o => o.value === warrantyOption);

  const [fields, setFields] = useState({
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
    clientSignature: inspData?.signature || null,
    employeeSignature: inspData?.employeeSignature || null,
  });

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }));

  const handleGenerate = () => {
    generatePDF({
      ...fields,
      warrantyDisplay: selectedOption.display,
      warrantyValue: warrantyOption,
      warrantyExpiry: calcExpiry(selectedOption.months),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#E8461E]" />
            <h2 className="font-bold text-slate-800">Póliza de Garantía — Nexor</h2>
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

          {/* Warranty Period Selector */}
          <div>
            <Label className="mb-2 block font-semibold">Plazo de garantía</Label>
            <div className="flex gap-2">
              {WARRANTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setWarrantyOption(opt.value)}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                    warrantyOption === opt.value
                      ? "border-[#E8461E] bg-[#E8461E] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#E8461E]/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Válida hasta: {calcExpiry(selectedOption.months)}
            </p>
          </div>

          {/* Order Info */}
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
                    <p className="text-xs text-slate-400 mb-1">Responsable</p>
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
            onClick={handleGenerate}
            className="bg-[#E8461E] hover:bg-[#c73a15] text-white"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
