import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Remito } from "@/entities/Remito";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { Product } from "@/entities/Product";
import User from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Plus, Trash2, Search, Package, Car, User as UserIcon,
  FileText, CheckCircle, Printer, X, AlertCircle, ClipboardList
} from "lucide-react";

const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-UY") : "-";

const STATUS_LABELS = { draft: "Borrador", issued: "Emitido", cancelled: "Anulado" };

export default function NewRemito() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");
  const printRef = useRef();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Order search
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    notes: "",
    status: "draft",
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [prods, ords, user] = await Promise.all([
        Product.filter({ status: "active" }, "name", 500),
        ServiceOrder.list("-createdAt", 200),
        User.me().catch(() => null),
      ]);
      setProducts(prods);
      setOrders(ords);
      setCurrentUser(user);

      if (editId) {
        const remito = await Remito.get(editId);
        if (remito) {
          setForm({
            date: remito.date || new Date().toISOString().split("T")[0],
            notes: remito.notes || "",
            status: remito.status || "draft",
          });
          setItems(JSON.parse(remito.items || "[]"));
          if (remito.service_order_id) {
            const order = ords.find(o => o.id === remito.service_order_id);
            if (order) setSelectedOrder(order);
          }
        }
      }
    };
    load();
  }, [editId]);

  const filteredOrders = orders.filter(o =>
    !orderSearch ||
    o.car_plate?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(orderSearch.toLowerCase())
  ).slice(0, 10);

  const filteredProducts = products.filter(p =>
    !productSearch ||
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  ).filter(p => !items.find(it => it.product_id === p.id))
    .slice(0, 8);

  const selectOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderPicker(false);
    setOrderSearch("");
  };

  const addProductItem = (product) => {
    setItems(prev => [...prev, {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku || "",
      quantity: 1,
      unit: product.unit || "unit",
      notes: "",
    }]);
    setProductSearch("");
    setShowProductPicker(false);
  };

  const addFreeItem = () => {
    setItems(prev => [...prev, {
      product_id: null,
      product_name: "",
      sku: "",
      quantity: 1,
      unit: "unit",
      notes: "",
    }]);
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const buildData = () => ({
    ...form,
    service_order_id: selectedOrder?.id || "",
    order_number: selectedOrder?.order_number || "",
    customer_name: selectedOrder?.customer_name || "",
    customer_phone: selectedOrder?.customer_phone || "",
    car_plate: selectedOrder?.car_plate || "",
    car_brand: selectedOrder?.car_brand || "",
    car_model: selectedOrder?.car_model || "",
    items: JSON.stringify(items),
    issued_by: currentUser?.username || "",
  });

  const handleSave = async () => {
    setSaving(true);
    const data = buildData();
    if (editId) {
      await Remito.update(editId, data);
    } else {
      const remitoNumber = `REM-${Date.now().toString().slice(-6)}`;
      await Remito.create({ ...data, remito_number: remitoNumber });
    }
    setSaving(false);
    navigate(createPageUrl("Remitos"));
  };

  const handleIssue = async () => {
    setIssuing(true);
    const data = buildData();
    const remitoNumber = editId ? undefined : `REM-${Date.now().toString().slice(-6)}`;

    // Descontar stock
    for (const item of items) {
      if (item.product_id) {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          const newStock = Math.max(0, (prod.stock_quantity || 0) - (item.quantity || 1));
          await Product.update(item.product_id, { stock_quantity: newStock });
        }
      }
    }

    const finalData = { ...data, status: "issued", ...(remitoNumber ? { remito_number: remitoNumber } : {}) };
    if (editId) {
      await Remito.update(editId, finalData);
    } else {
      await Remito.create(finalData);
    }
    setIssuing(false);
    navigate(createPageUrl("Remitos"));
  };

  const handleCancel = async () => {
    if (!editId) return;
    await Remito.update(editId, { status: "cancelled" });
    navigate(createPageUrl("Remitos"));
  };

  const handlePrint = () => window.print();

  const isIssued = form.status === "issued";
  const isCancelled = form.status === "cancelled";
  const isReadOnly = isIssued || isCancelled;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #remito-print, #remito-print * { visibility: visible !important; }
          #remito-print { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6 no-print">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Remitos"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">
                {editId ? "Remito" : "Nuevo Remito"}
              </h1>
              {form.status !== "draft" && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  isIssued ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-600 border-red-200"
                }`}>
                  {STATUS_LABELS[form.status]}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">Salida de mercadería del depósito</p>
          </div>
          {(isIssued || (editId && items.length > 0)) && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />Imprimir
            </Button>
          )}
        </div>

        {/* 1. Orden de servicio */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-[#E8461E]/10 rounded flex items-center justify-center">
              <span className="text-[#E8461E] text-xs font-bold">1</span>
            </div>
            Orden de Servicio Asociada
          </h2>

          {selectedOrder ? (
            <div className="flex items-start justify-between bg-[#E8461E]/5 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-[#E8461E]/10 rounded-xl flex items-center justify-center">
                  <Car className="h-4 w-4 text-[#E8461E]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{selectedOrder.car_plate}</span>
                    {selectedOrder.order_number && (
                      <span className="text-xs text-slate-400">#{selectedOrder.order_number}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {[selectedOrder.car_brand, selectedOrder.car_model, selectedOrder.car_year].filter(Boolean).join(" ")}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />{selectedOrder.customer_name}
                  </p>
                </div>
              </div>
              {!isReadOnly && (
                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por patente, número de orden o cliente..."
                  value={orderSearch}
                  onChange={e => { setOrderSearch(e.target.value); setShowOrderPicker(true); }}
                  onFocus={() => setShowOrderPicker(true)}
                  className="pl-8"
                  disabled={isReadOnly}
                />
              </div>
              {showOrderPicker && orderSearch && (
                <div className="border rounded-xl mt-1 max-h-48 overflow-y-auto bg-white shadow-md z-10">
                  {filteredOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 text-center">Sin resultados</p>
                  ) : filteredOrders.map(o => (
                    <button
                      key={o.id}
                      onClick={() => selectOrder(o)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b last:border-0 flex items-center gap-3"
                    >
                      <Car className="h-4 w-4 text-[#E8461E] shrink-0" />
                      <div>
                        <span className="font-semibold text-sm text-slate-800">{o.car_plate}</span>
                        {o.order_number && <span className="text-xs text-slate-400 ml-1.5">#{o.order_number}</span>}
                        <p className="text-xs text-slate-500">{o.customer_name} · {[o.car_brand, o.car_model].filter(Boolean).join(" ")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />El remito puede emitirse sin orden asociada
              </p>
            </div>
          )}
        </div>

        {/* 2. Fecha y notas */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-[#E8461E]/10 rounded flex items-center justify-center">
              <span className="text-[#E8461E] text-xs font-bold">2</span>
            </div>
            Datos del Remito
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="mt-1"
                disabled={isReadOnly}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones del remito..."
                rows={2}
                className="mt-1 text-sm"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>

        {/* 3. Items */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-6 h-6 bg-[#E8461E]/10 rounded flex items-center justify-center">
                <span className="text-[#E8461E] text-xs font-bold">3</span>
              </div>
              Mercadería
            </h2>
            {!isReadOnly && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addFreeItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Ítem libre
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowProductPicker(!showProductPicker)}>
                  <Package className="h-3.5 w-3.5 mr-1" />Del catálogo
                </Button>
              </div>
            )}
          </div>

          {/* Product picker */}
          {showProductPicker && !isReadOnly && (
            <div className="mb-4 border rounded-xl p-3 bg-slate-50">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar producto por nombre o SKU..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 text-center">Sin resultados</p>
                ) : filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProductItem(p)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-sm border border-transparent hover:border-orange-200 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-[#E8461E] shrink-0" />
                      <div>
                        <span className="font-medium text-slate-700">{p.name}</span>
                        {p.sku && <span className="text-xs text-slate-400 ml-1.5">SKU: {p.sku}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">Stock: {p.stock_quantity ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Agregá los productos a remitir</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-2 text-xs text-slate-400 font-medium">
                <span className="col-span-5">Producto</span>
                <span className="col-span-2 text-center">Cantidad</span>
                <span className="col-span-3">Notas</span>
                <span className="col-span-2"></span>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-lg px-2 py-2">
                  <div className="col-span-5 flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {item.product_id ? (
                      <span className="text-sm text-slate-700 truncate">{item.product_name}</span>
                    ) : (
                      <Input
                        value={item.product_name}
                        onChange={e => updateItem(idx, "product_name", e.target.value)}
                        placeholder="Descripción..."
                        className="h-7 text-xs"
                        disabled={isReadOnly}
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="h-7 text-xs text-center"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={item.notes}
                      onChange={e => updateItem(idx, "notes", e.target.value)}
                      placeholder="Obs..."
                      className="h-7 text-xs"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {!isReadOnly && (
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => navigate(createPageUrl("Remitos"))}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar borrador"}
            </Button>
            <Button
              onClick={handleIssue}
              disabled={issuing || items.length === 0}
              className="bg-[#E8461E] hover:bg-[#c73a15]"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {issuing ? "Emitiendo..." : "Emitir Remito"}
            </Button>
          </div>
        )}
        {isIssued && editId && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(createPageUrl("Remitos"))}>
              Volver
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleCancel}
            >
              Anular Remito
            </Button>
          </div>
        )}
        {isCancelled && (
          <Button variant="outline" onClick={() => navigate(createPageUrl("Remitos"))}>
            Volver
          </Button>
        )}
      </div>

      {/* Print view */}
      <div id="remito-print" className="hidden print:block p-8 font-sans text-sm text-slate-800">
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">REMITO DE DEPÓSITO</h1>
              <p className="text-slate-500 mt-1">Salida de mercadería</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-700">
                {/* number shown at print time */}
              </p>
              <p className="text-slate-500">Fecha: {fmtDate(form.date)}</p>
              <p className="text-slate-500">Estado: {STATUS_LABELS[form.status]}</p>
            </div>
          </div>
        </div>

        {selectedOrder && (
          <div className="mb-6 grid grid-cols-2 gap-6">
            <div>
              <p className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-2">Vehículo</p>
              <p className="font-bold text-lg">{selectedOrder.car_plate}</p>
              <p>{[selectedOrder.car_brand, selectedOrder.car_model, selectedOrder.car_year].filter(Boolean).join(" ")}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-600 text-xs uppercase tracking-wide mb-2">Cliente</p>
              <p className="font-bold">{selectedOrder.customer_name}</p>
              {selectedOrder.customer_phone && <p>{selectedOrder.customer_phone}</p>}
              {selectedOrder.order_number && <p className="text-slate-500">Orden: #{selectedOrder.order_number}</p>}
            </div>
          </div>
        )}

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="text-left py-2 pr-4">Producto</th>
              <th className="text-left py-2 pr-4">SKU</th>
              <th className="text-center py-2 pr-4">Cantidad</th>
              <th className="text-left py-2">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-2 pr-4 font-medium">{item.product_name || "—"}</td>
                <td className="py-2 pr-4 text-slate-500">{item.sku || "—"}</td>
                <td className="py-2 pr-4 text-center font-bold">{item.quantity}</td>
                <td className="py-2 text-slate-500">{item.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {form.notes && (
          <div className="mb-6 bg-slate-50 p-3 rounded">
            <p className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-1">Notas</p>
            <p>{form.notes}</p>
          </div>
        )}

        <div className="mt-12 grid grid-cols-2 gap-12">
          <div className="border-t border-slate-400 pt-2 text-center text-slate-500 text-xs">
            Firma quien entrega
          </div>
          <div className="border-t border-slate-400 pt-2 text-center text-slate-500 text-xs">
            Firma quien recibe
          </div>
        </div>
      </div>
    </>
  );
}