import { useState } from "react";
import { Search, Package, Trash2, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoneda } from "./purchaseFormat";

/**
 * Líneas de una compra. Además de cargar cantidad y costo, avisa si otro
 * proveedor vendió ese producto más barato la última vez: es el momento en
 * que el dato sirve, antes de pagar.
 */
export default function POItemsEditor({ products, items, onItemsChange, currency, exchangeRate, supplierId, precios = [] }) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const filtered = products.filter((p) => !search || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q));
  const tc = currency === "USD" ? (Number(exchangeRate) || 1) : 1;
  const preciosDe = (productId) => precios.find((p) => String(p.product_id) === String(productId))?.proveedores || [];

  // El costo sugerido es lo que se le pagó a este mismo proveedor la última
  // vez; si nunca se le compró, el costo actual del producto.
  const costoSugerido = (product) => {
    const anterior = preciosDe(product.id).find((x) => String(x.supplier_id) === String(supplierId));
    const enPesos = anterior ? anterior.ultimo_costo_uyu : Number(product.cost_price) || 0;
    return Math.round((enPesos / tc) * 100) / 100;
  };

  const addItem = (product) => {
    if (items.find((i) => String(i.product_id) === String(product.id))) return setSearch("");
    const costo = costoSugerido(product);
    onItemsChange([...items, { product_id: String(product.id), product_name: product.name, sku: product.sku, quantity: 1, unit_cost: costo }]);
    setSearch("");
  };

  const updateItem = (idx, field, value) => {
    onItemsChange(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-sm">Productos comprados</CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar por nombre, SKU o código" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </CardHeader>
      <CardContent>
        {search && (
          <div className="mb-4 max-h-56 overflow-y-auto border rounded-lg divide-y">
            {filtered.length === 0 && <p className="text-sm text-slate-400 p-3">No hay productos con ese nombre. Si es nuevo, primero cargalo en Productos.</p>}
            {filtered.slice(0, 12).map((p) => (
              <button key={p.id} className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 text-left" onClick={() => addItem(p)}>
                <Package className="h-4 w-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.sku} · stock {p.stock_quantity ?? 0}</p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">costo {fmtMoneda(p.cost_price, "UYU")}</span>
              </button>
            ))}
          </div>
        )}
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="text-xs text-slate-500 uppercase border-b">
                <tr>
                  <th className="text-left py-2">Producto</th>
                  <th className="text-center py-2 w-24">Cantidad</th>
                  <th className="text-right py-2 w-32">Costo unit. {currency === "USD" ? "US$" : "$"}</th>
                  <th className="text-right py-2 w-28">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const otros = preciosDe(item.product_id);
                  const costoUyu = (Number(item.unit_cost) || 0) * tc;
                  const masBarato = otros.find((x) => x.ultimo_costo_uyu < costoUyu - 0.005 && String(x.supplier_id) !== String(supplierId));
                  const esteProveedor = otros.find((x) => String(x.supplier_id) === String(supplierId));
                  return (
                    <tr key={item.product_id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-2">
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-slate-500">{item.sku}</p>
                        {esteProveedor && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Última vez a este proveedor: {fmtMoneda(esteProveedor.ultimo_costo, esteProveedor.ultima_moneda)}
                          </p>
                        )}
                        {masBarato && (
                          <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {masBarato.supplier_name} lo vendió a {fmtMoneda(masBarato.ultimo_costo, masBarato.ultima_moneda)}
                            {masBarato.ultima_moneda !== "UYU" && ` (${fmtMoneda(masBarato.ultimo_costo_uyu, "UYU")})`}
                          </p>
                        )}
                      </td>
                      <td className="text-center py-2">
                        <Input type="number" min="1" step="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-20 text-center mx-auto h-8" />
                      </td>
                      <td className="text-right py-2">
                        <Input type="number" min="0" step="0.01" value={item.unit_cost} onChange={(e) => updateItem(idx, "unit_cost", e.target.value === "" ? "" : parseFloat(e.target.value))} className="w-28 text-right ml-auto h-8" />
                      </td>
                      <td className="text-right font-medium py-2 pt-3.5 text-sm">{fmtMoneda((Number(item.unit_cost) || 0) * item.quantity, currency)}</td>
                      <td className="py-2"><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onItemsChange(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-center py-8 text-slate-400 text-sm">Buscá y agregá los productos que compraste</p>}
      </CardContent>
    </Card>
  );
}
