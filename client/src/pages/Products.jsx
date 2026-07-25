import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@/entities/Product";
import { StockMovement } from "@/entities/StockMovement";
import { Category } from "@/entities/Category";
import { Supplier } from "@/entities/Supplier";
import { CarBrand } from "@/entities/CarBrand";
import User from "@/entities/User";
import { Search, Plus, Package, Upload, ChevronUp, ChevronDown, ChevronsUpDown, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProductRow from "../components/ProductRow";
import ProductForm from "../components/ProductForm";
import ProductImportDialog from "../components/ProductImportDialog";
import { useLanguage } from "../context/LanguageContext";

export default function Products() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { User.me().then(u => { if (u?.role === "admin") setIsAdmin(true); }).catch(() => {}); }, []);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(() => new URLSearchParams(window.location.search).get("category") || "all");
  const [showForm, setShowForm] = useState(false); const [editProduct, setEditProduct] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const { data: products = [], isLoading } = useQuery({ queryKey: ["products"], queryFn: () => Product.list("name", 500) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => Category.filter({ is_active: true }, "sort_order", 50) });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => Supplier.filter({ is_active: true }, "name", 100) });
  const { data: carBrands = [], refetch: refetchCarBrands } = useQuery({ queryKey: ["carBrands"], queryFn: () => CarBrand.list("name", 200) });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const saved = editProduct ? await Product.update(editProduct.id, data) : await Product.create({ unit_price: 0, ...data, is_active: true });
      // Auto-crear categoría si no existe
      if (data.category?.trim()) {
        const catName = data.category.trim();
        const exists = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (!exists) {
          await Category.create({ name: catName, is_active: true, sort_order: categories.length });
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        }
      }
      // Guardar marca/modelo en CarBrand si aplica
      if (data.car_brand) {
        const brandName = data.car_brand.trim();
        const existing = carBrands.find((b) => b.name.toLowerCase() === brandName.toLowerCase());
        if (existing) {
          // Agregar modelo si es nuevo
          if (data.car_model) {
            const models = (() => { try { return JSON.parse(existing.models_json || "[]"); } catch { return []; } })();
            if (!models.map(m => m.toLowerCase()).includes(data.car_model.trim().toLowerCase())) {
              models.push(data.car_model.trim());
              await CarBrand.update(existing.id, { models_json: JSON.stringify(models) });
            }
          }
        } else {
          // Crear nueva marca
          const models = data.car_model ? [data.car_model.trim()] : [];
          await CarBrand.create({ name: brandName, models_json: JSON.stringify(models) });
        }
        refetchCarBrands();
      }
      return saved;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setShowForm(false); setEditProduct(null); },
    onError: (err) => { alert(`Error al guardar: ${err.message}`); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const handleAddStock = async (product, qty) => {
    await StockMovement.move({
      product_id: product.id,
      movement_type: "restock",
      quantity: qty,
      reference_type: "manual",
      reason: "Ingreso manual de stock",
    });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const [deletingAll, setDeletingAll] = useState(false);
  const deleteAllProducts = async () => {
    if (!window.confirm(`¿Borrar todos los ${products.length} productos? Esta acción no se puede deshacer.`)) return;
    if (!window.confirm("¿Estás SEGURO? Se eliminarán TODOS los productos permanentemente.")) return;
    setDeletingAll(true);
    for (const p of products) {
      await Product.delete(p.id);
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setDeletingAll(false);
  };

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || (statusFilter === "active" && p.status === "active") || (statusFilter === "inactive" && p.status !== "active") || (statusFilter === "low" && p.stockQuantity <= p.minStock);
      return matchSearch && matchStatus && (categoryFilter === "all" || p.category === categoryFilter);
    });
    return [...filtered].sort((a, b) => {
      let va = a[sortCol] ?? ""; let vb = b[sortCol] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [products, search, statusFilter, categoryFilter, sortCol, sortDir]);

  const stats = { total: products.length, active: products.filter((p) => p.status === "active").length, lowStock: products.filter((p) => p.stockQuantity <= p.minStock).length };

  const fmt = (v) => `$${(Number(v) || 0).toLocaleString("es-UY", { minimumFractionDigits: 0 })}`;

  const handlePrintStock = () => setTimeout(() => window.print(), 150);

  const totalStockValue = filteredProducts.reduce((s, p) => s + ((Number(p.costPrice) || 0) * (Number(p.stockQuantity) || 0)), 0);
  const totalSaleValue = filteredProducts.reduce((s, p) => s + ((Number(p.unitPrice) || 0) * (Number(p.stockQuantity) || 0)), 0);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("products")}</h1>
        <div className="flex gap-2">
          {isAdmin && products.length > 0 && <Button variant="destructive" onClick={deleteAllProducts} disabled={deletingAll}>{deletingAll ? "Borrando..." : `Borrar todos (${products.length})`}</Button>}
          <Button variant="outline" onClick={handlePrintStock}><FileText className="h-4 w-4 mr-2" />Reporte Stock</Button>
          <Button variant="outline" onClick={() => setShowImport(true)}><Upload className="h-4 w-4 mr-2" />Importar CSV</Button>
          <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={() => { setEditProduct(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" />{t("addProduct")}</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">{t("totalProducts")}</p><p className="text-2xl font-bold text-slate-900">{stats.total}</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">{t("active")}</p><p className="text-2xl font-bold text-[#E8461E]">{stats.active}</p></div>
        <div className="bg-white rounded-lg shadow-sm p-4"><p className="text-xs text-slate-500 uppercase">{t("lowStock")}</p><p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p></div>
      </div>
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder={t("searchProducts")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}><TabsList><TabsTrigger value="all">{t("all")}</TabsTrigger><TabsTrigger value="active">{t("active")}</TabsTrigger><TabsTrigger value="inactive">{t("inactive")}</TabsTrigger><TabsTrigger value="low">{t("lowStock")}</TabsTrigger></TabsList></Tabs>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-background text-sm">
          <option value="all">{t("all")} {t("categories")}</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t("noProductsFound")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  {[
                    { label: "Nombre",    col: "name",          align: "left"  },
                    { label: "SKU",       col: "sku",           align: "left"  },
                    { label: "Categoría", col: "category",      align: "left"  },
                    { label: "Vehículo",  col: null,            align: "left"  },
                    { label: "P. Venta",  col: "unitPrice",     align: "right" },
                    { label: "P. Costo",  col: "costPrice",     align: "right" },
                    { label: "Stock",     col: "stockQuantity", align: "left"  },
                    { label: "Proveedor", col: "supplierName",  align: "left"  },
                    { label: "Estado",    col: "status",        align: "left"  },
                  ].map(({ label, col, align }) => (
                    <th key={label} className={`px-4 py-3 font-medium text-${align}`}>
                      {col ? (
                        <button
                          onClick={() => handleSort(col)}
                          className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors"
                        >
                          {label}
                          {sortCol === col
                            ? sortDir === "asc"
                              ? <ChevronUp className="h-3 w-3" />
                              : <ChevronDown className="h-3 w-3" />
                            : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      ) : label}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    onEdit={(p) => { setEditProduct(p); setShowForm(true); }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onAddStock={handleAddStock}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle>{editProduct ? t("editProduct") : t("addProduct")}</DialogTitle></DialogHeader>
          <ProductForm product={editProduct} categories={categories} suppliers={suppliers} carBrands={carBrands} existingProducts={products} onSave={(data) => saveMutation.mutate(data)} onCancel={() => setShowForm(false)} isSaving={saveMutation.isPending} />
        </DialogContent>
      </Dialog>
      <ProductImportDialog open={showImport} onClose={() => setShowImport(false)} onDone={() => { queryClient.invalidateQueries({ queryKey: ["products"] }); setShowImport(false); }} />

      {/* Print view — stock report */}
      <div id="stock-print" className="stock-print-hidden">
        <style>{`
          .stock-print-hidden { position: absolute; left: -9999px; top: 0; width: 210mm; font-family: sans-serif; font-size: 10px; color: #1e293b; }
          @media print {
            body * { visibility: hidden !important; }
            .stock-print-hidden, .stock-print-hidden * { visibility: visible !important; }
            .stock-print-hidden { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 16px !important; z-index: 99999; background: white; }
            .stock-print-hidden table { page-break-inside: auto; }
            .stock-print-hidden tr { page-break-inside: avoid; }
          }
        `}</style>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #1e293b", paddingBottom: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: "bold", margin: 0 }}>REPORTE DE STOCK</h1>
              <p style={{ color: "#64748b", margin: "2px 0 0", fontSize: 10 }}>Taller — Inventario de productos</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontWeight: "bold", fontSize: 12 }}>{new Date().toLocaleDateString("es-UY", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <p style={{ color: "#64748b", fontSize: 9 }}>
                {filteredProducts.length} productos
                {categoryFilter !== "all" ? ` · Categoría: ${categoryFilter}` : ""}
                {statusFilter !== "all" ? ` · ${statusFilter === "active" ? "Activos" : statusFilter === "low" ? "Stock bajo" : "Inactivos"}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}>
            <p style={{ color: "#64748b", fontSize: 9, marginBottom: 2 }}>Total productos</p>
            <p style={{ fontWeight: "bold", fontSize: 14 }}>{filteredProducts.length}</p>
          </div>
          <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}>
            <p style={{ color: "#64748b", fontSize: 9, marginBottom: 2 }}>Stock bajo</p>
            <p style={{ fontWeight: "bold", fontSize: 14, color: "#d97706" }}>{filteredProducts.filter(p => (Number(p.stockQuantity) || 0) <= (Number(p.minStock) || 0)).length}</p>
          </div>
          <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}>
            <p style={{ color: "#64748b", fontSize: 9, marginBottom: 2 }}>Valor stock (costo)</p>
            <p style={{ fontWeight: "bold", fontSize: 14 }}>{fmt(totalStockValue)}</p>
          </div>
          <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}>
            <p style={{ color: "#64748b", fontSize: 9, marginBottom: 2 }}>Valor stock (venta)</p>
            <p style={{ fontWeight: "bold", fontSize: 14, color: "#ea580c" }}>{fmt(totalSaleValue)}</p>
          </div>
        </div>

        {/* Product table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #cbd5e1", background: "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: "4px 4px" }}>Producto</th>
              <th style={{ textAlign: "left", padding: "4px 4px" }}>SKU</th>
              <th style={{ textAlign: "left", padding: "4px 4px" }}>Categoría</th>
              <th style={{ textAlign: "right", padding: "4px 4px" }}>P. Costo</th>
              <th style={{ textAlign: "right", padding: "4px 4px" }}>P. Venta</th>
              <th style={{ textAlign: "center", padding: "4px 4px" }}>Stock</th>
              <th style={{ textAlign: "center", padding: "4px 4px" }}>Mín.</th>
              <th style={{ textAlign: "left", padding: "4px 4px" }}>Proveedor</th>
              <th style={{ textAlign: "left", padding: "4px 4px" }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p, i) => {
              const qty = Number(p.stockQuantity) || 0;
              const min = Number(p.minStock) || 0;
              const isLow = qty <= min;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", background: isLow ? "#fef3c7" : (i % 2 === 0 ? "#fff" : "#fafafa") }}>
                  <td style={{ padding: "3px 4px", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                  <td style={{ padding: "3px 4px", fontFamily: "monospace", color: "#64748b" }}>{p.sku || "—"}</td>
                  <td style={{ padding: "3px 4px", color: "#64748b" }}>{p.category || "—"}</td>
                  <td style={{ padding: "3px 4px", textAlign: "right" }}>{fmt(p.costPrice)}</td>
                  <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: 500, color: "#ea580c" }}>{fmt(p.unitPrice)}</td>
                  <td style={{ padding: "3px 4px", textAlign: "center", fontWeight: "bold", color: isLow ? "#b45309" : "#1e293b" }}>{qty}</td>
                  <td style={{ padding: "3px 4px", textAlign: "center", color: "#94a3b8" }}>{min}</td>
                  <td style={{ padding: "3px 4px", color: "#64748b", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.supplierName || "—"}</td>
                  <td style={{ padding: "3px 4px" }}>
                    <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 10, background: p.status === "active" ? "#dcfce7" : "#f1f5f9", color: p.status === "active" ? "#15803d" : "#64748b" }}>
                      {p.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer totals */}
        <div style={{ borderTop: "2px solid #1e293b", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 10 }}>
          <span style={{ color: "#64748b" }}>{filteredProducts.length} productos listados</span>
          <div style={{ display: "flex", gap: 20 }}>
            <span>Valor costo: <strong>{fmt(totalStockValue)}</strong></span>
            <span>Valor venta: <strong style={{ color: "#ea580c" }}>{fmt(totalSaleValue)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}