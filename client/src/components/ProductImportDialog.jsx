import { useState, useRef } from "react";
import { Product } from "@/entities/Product";
import { Category } from "@/entities/Category";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, AlertCircle, RefreshCw, X, FileText } from "lucide-react";

const COLUMNS = [
  "name", "sku", "barcode", "description", "category",
  "unit_price", "cost_price", "stock_quantity", "min_stock",
  "unit", "tax_rate", "location", "status",
  "supplier_name", "car_brand", "car_model", "car_year"
];

const COLUMN_LABELS = {
  name: "Nombre", sku: "SKU", barcode: "Código de barras", description: "Descripción",
  category: "Categoría", unit_price: "Precio venta", cost_price: "Precio costo",
  stock_quantity: "Stock", min_stock: "Stock mínimo", unit: "Unidad",
  tax_rate: "IVA %", location: "Ubicación", status: "Estado",
  supplier_name: "Proveedor", car_brand: "Marca auto", car_model: "Modelo auto", car_year: "Año auto"
};

function downloadTemplate() {
  const header = COLUMNS.join(",");
  const example = [
    "Filtro de aceite Toyota", "FIL-001", "", "Filtro original", "Filtros",
    "850", "400", "10", "3", "unit", "22", "Estante A1", "active",
    "Toyota Parts", "Toyota", "Corolla", "2020"
  ].join(",");
  const csv = `${header}\n${example}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "productos_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line, idx) => {
    // Handle quoted fields with commas
    const values = [];
    let current = ""; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += line[i]; }
    }
    values.push(current.trim());
    const row = { _line: idx + 2 };
    headers.forEach((h, i) => { row[h] = values[i] !== undefined ? values[i].replace(/^"|"$/g, "") : ""; });
    return row;
  });
}

function validateRow(row) {
  const errors = [];
  if (!row.name?.trim()) errors.push("Nombre requerido");
  if (!row.sku?.trim()) errors.push("SKU requerido");
  if (!row.unit_price || isNaN(parseFloat(row.unit_price))) errors.push("Precio inválido");
  return errors;
}

function toProductData(row) {
  return {
    name: row.name?.trim(),
    sku: row.sku?.trim(),
    barcode: row.barcode?.trim() || "",
    description: row.description?.trim() || "",
    category: row.category?.trim() || "",
    unit_price: parseFloat(row.unit_price) || 0,
    cost_price: parseFloat(row.cost_price) || 0,
    stock_quantity: parseInt(row.stock_quantity) || 0,
    min_stock: parseInt(row.min_stock) || 1,
    unit: row.unit?.trim() || "unit",
    tax_rate: parseFloat(row.tax_rate) || 0,
    location: row.location?.trim() || "",
    status: row.status?.trim() || "active",
    supplier_name: row.supplier_name?.trim() || "",
    car_brand: row.car_brand?.trim() || "",
    car_model: row.car_model?.trim() || "",
    car_year: row.car_year ? parseInt(row.car_year) || "" : "",
    is_active: true,
    volume_discounts: "[]",
  };
}

export default function ProductImportDialog({ open, onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [existingProducts, setExistingProducts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const parsed = parseCSV(text);
    // Load existing products to detect updates
    const existing = await Product.list("name", 2000);
    setExistingProducts(existing);
    const enriched = parsed.map(row => {
      const errors = validateRow(row);
      const match = existing.find(p => p.sku?.trim().toLowerCase() === row.sku?.trim().toLowerCase());
      return { ...row, _errors: errors, _action: errors.length ? "error" : match ? "update" : "create", _existingId: match?.id };
    });
    setRows(enriched);
  };

  const validRows = rows.filter(r => r._action !== "error");
  const createRows = rows.filter(r => r._action === "create");
  const updateRows = rows.filter(r => r._action === "update");
  const errorRows = rows.filter(r => r._action === "error");

  const handleImport = async () => {
    setImporting(true);
    let created = 0, updated = 0, failed = 0;

    // Recopilar categorías nuevas del CSV y crearlas si no existen
    const existingCategories = await Category.filter({ is_active: true }, "name", 200);
    const existingCatNames = existingCategories.map(c => c.name.toLowerCase());
    const newCatNames = [...new Set(
      validRows.map(r => r.category?.trim()).filter(Boolean)
        .filter(name => !existingCatNames.includes(name.toLowerCase()))
    )];
    for (const name of newCatNames) {
      await Category.create({ name, is_active: true, sort_order: existingCategories.length });
    }

    for (const row of validRows) {
      const data = toProductData(row);
      if (row._action === "create") {
        await Product.create(data);
        created++;
      } else if (row._action === "update") {
        await Product.update(row._existingId, data);
        updated++;
      }
    }
    setImporting(false);
    setResult({ created, updated, failed });
    onDone?.();
  };

  const reset = () => { setRows([]); setFileName(""); setResult(null); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Importar Productos (CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Step 1: Download template */}
          <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">1. Descargá el template</p>
              <p className="text-xs text-slate-500 mt-0.5">Completá el CSV con tus productos y volvé a subirlo</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />Descargar Template
            </Button>
          </div>

          {/* Step 2: Upload */}
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">
              {fileName ? <span className="font-medium text-orange-600">{fileName}</span> : "Seleccioná tu archivo CSV"}
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {fileName ? "Cambiar archivo" : "Seleccionar CSV"}
            </Button>
          </div>

          {/* Preview */}
          {rows.length > 0 && !result && (
            <div className="space-y-3">
              {/* Summary badges */}
              <div className="flex gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />{createRows.length} nuevos
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium">
                  <RefreshCw className="h-3.5 w-3.5" />{updateRows.length} a actualizar
                </span>
                {errorRows.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-full font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />{errorRows.length} con errores (se omiten)
                  </span>
                )}
              </div>

              {/* Table preview */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Fila</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Nombre</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">SKU</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Precio</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Stock</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, i) => (
                        <tr key={i} className={row._action === "error" ? "bg-red-50" : row._action === "update" ? "bg-blue-50" : ""}>
                          <td className="px-3 py-2 text-slate-400">{row._line}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{row.name || "—"}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{row.sku || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{row.unit_price || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{row.stock_quantity || "0"}</td>
                          <td className="px-3 py-2">
                            {row._action === "create" && <span className="text-emerald-600 font-medium">Nuevo</span>}
                            {row._action === "update" && <span className="text-blue-600 font-medium">Actualizar</span>}
                            {row._action === "error" && (
                              <span className="text-red-600" title={row._errors.join(", ")}>
                                Error: {row._errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center space-y-1">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-emerald-800">¡Importación completada!</p>
              <p className="text-sm text-emerald-700">
                {result.created} productos creados · {result.updated} actualizados
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={reset} disabled={importing}>
            <X className="h-4 w-4 mr-1" />Limpiar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={importing}>Cerrar</Button>
            {!result && validRows.length > 0 && (
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Importando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Importar {validRows.length} productos</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}