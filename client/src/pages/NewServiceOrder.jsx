import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ServiceOrder } from "@/entities/ServiceOrder";
import { ServiceType } from "@/entities/ServiceType";
import { Product } from "@/entities/Product";
import { StockMovement } from "@/entities/StockMovement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Package, Wrench, ChevronDown, ChevronUp, Search, X, Clock, CalendarDays, User, Phone, Car, AlertCircle } from "lucide-react";
import QuickScheduleInput from "@/components/QuickScheduleInput";

const formatCurrency = (n) => `$${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;

function ServiceCard({ service, index, products, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [productSearch, setProductSearch] = useState("");

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
    !service.products.find(sp => sp.product_id === p.id) &&
    (Number(p.stockQuantity || p.stock_quantity) || 0) > 0
  );

  const addProduct = (product) => {
    const newProduct = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      cost_price: product.costPrice || product.cost_price || 0,
      sale_price: product.unitPrice || product.unit_price || 0,
      max_stock: Number(product.stockQuantity || product.stock_quantity) || 0
    };
    const updated = [...service.products, newProduct];
    const productsTotal = updated.reduce((s, p) => s + (Number(p.sale_price) || 0) * (Number(p.quantity) || 1), 0);
    onUpdate({ ...service, products: updated, sale_price: productsTotal + (Number(service.labor_cost) || 0) });
    setProductSearch("");
  };

  const recalcTotal = (prods, labor) => {
    const productsTotal = prods.reduce((s, p) => s + (Number(p.sale_price) || 0) * (Number(p.quantity) || 1), 0);
    return productsTotal + (Number(labor) || 0);
  };

  const removeProduct = (productId) => {
    const updated = service.products.filter(p => p.product_id !== productId);
    onUpdate({ ...service, products: updated, sale_price: recalcTotal(updated, service.labor_cost) });
  };

  const updateQty = (productId, qty) => {
    const updated = service.products.map(p => {
      if (p.product_id !== productId) return p;
      const maxQ = p.max_stock || 999;
      return { ...p, quantity: Math.min(maxQ, Math.max(1, parseInt(qty) || 1)) };
    });
    onUpdate({ ...service, products: updated, sale_price: recalcTotal(updated, service.labor_cost) });
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div
        className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#E8461E]/10 rounded-lg flex items-center justify-center">
            <Wrench className="h-3.5 w-3.5 text-[#E8461E]" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800">{service.service_name}</p>
            <p className="text-xs text-slate-500">{service.products.length} producto(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-bold text-slate-800 text-sm">{formatCurrency(service.sale_price)}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            className="text-red-400 hover:text-red-600 p-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Productos / Insumos */}
          <div>
            <Label className="text-xs mb-2 block">Productos / Insumos</Label>
            <div className="space-y-2">
              {service.products.map(p => {
                const pSalePrice = Number(p.sale_price) || 0;
                return (
                  <div key={p.product_id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm flex-1">{p.product_name}</span>
                    <span className="text-xs text-slate-500 shrink-0">{formatCurrency(pSalePrice)}</span>
                    <span className="text-xs text-slate-300">×</span>
                    <Input
                      type="number" min="1" value={p.quantity}
                      onChange={e => updateQty(p.product_id, e.target.value)}
                      className="w-14 h-7 text-xs text-center"
                    />
                    <span className="text-xs font-semibold text-slate-700 w-16 text-right shrink-0">{formatCurrency(pSalePrice * (Number(p.quantity) || 1))}</span>
                    <button onClick={() => removeProduct(p.product_id)} className="text-red-400 hover:text-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Agregar producto..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {productSearch && (
              <div className="border rounded-md mt-1 max-h-36 overflow-y-auto bg-white shadow-sm z-10">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">Sin resultados</p>
                ) : filteredProducts.slice(0, 8).map(p => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex justify-between border-b last:border-0">
                    <span>{p.name}</span>
                    <span className="text-slate-400">{formatCurrency(p.unitPrice || 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mano de obra */}
          <div className="max-w-xs">
            <Label className="text-xs">Mano de obra</Label>
            <Input
              type="number"
              value={service.labor_cost || ""}
              onChange={e => {
                const labor = e.target.value;
                onUpdate({ ...service, labor_cost: labor, sale_price: recalcTotal(service.products, labor) });
              }}
              placeholder="0"
              className="h-8 text-sm"
            />
          </div>

          {/* Resumen */}
          {(service.products.length > 0 || Number(service.labor_cost) > 0) && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
              {service.products.length > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Insumos</span>
                  <span>{formatCurrency(service.products.reduce((s, p) => s + (Number(p.sale_price) || 0) * (Number(p.quantity) || 1), 0))}</span>
                </div>
              )}
              {Number(service.labor_cost) > 0 && (
                <div className="flex justify-between text-[#E8461E]">
                  <span>Mano de obra</span>
                  <span>{formatCurrency(service.labor_cost)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                <span>Total servicio</span>
                <span>{formatCurrency(service.sale_price)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewServiceOrder() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");

  const [serviceTypes, setServiceTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    customer_name: urlParams.get("customer_name") || "",
    customer_phone: urlParams.get("customer_phone") || "",
    car_plate: urlParams.get("car_plate") || "",
    car_brand: urlParams.get("car_brand") || "",
    car_model: urlParams.get("car_model") || "",
    car_year: "", car_mileage: "", car_color: "",
    entry_date: urlParams.get("entry_date") || new Date().toISOString().split("T")[0],
    appointment_time: urlParams.get("appointment_time") || "",
    delivery_date: "",
    status: "pending",
    payment_status: "unpaid",
    notes: urlParams.get("notes") || ""
  });
  const [services, setServices] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [sts, prods] = await Promise.all([
        ServiceType.filter({ status: "active" }, "name"),
        Product.list("name")
      ]);
      setServiceTypes(sts);
      setProducts(prods);

      if (editId) {
        const order = await ServiceOrder.get(editId);
        if (order) {
          setForm({
            customer_name: order.customerName || "",
            customer_phone: order.customerPhone || "",
            car_plate: order.carPlate || "",
            car_brand: order.carBrand || "",
            car_model: order.carModel || "",
            car_year: order.carYear || "",
            car_mileage: order.carMileage || "",
            car_color: order.carColor || "",
            entry_date: order.entryDate || new Date().toISOString().split("T")[0],
            appointment_time: order.appointmentTime || "",
            delivery_date: order.deliveryDate || "",
            status: order.status || "pending",
            payment_status: order.paymentStatus || "unpaid",
            notes: order.notes || ""
          });
          setServices(JSON.parse(order.services || "[]"));
        }
      } else {
        // Pre-cargar servicio desde query param (viene de Agenda)
        const svcName = urlParams.get("service_description");
        if (svcName && sts.length > 0) {
          const match = sts.find(s => s.name.toLowerCase() === svcName.toLowerCase());
          if (match) {
            setServices([{ service_type_id: match.id, service_name: match.name, sale_price: "", labor_cost: "", products: [] }]);
          } else {
            setServices([{ service_type_id: "", service_name: svcName, sale_price: "", labor_cost: "", products: [] }]);
          }
        }
      }
    };
    load();
  }, [editId]);

  const addService = (st) => {
    setServices([...services, {
      service_type_id: st.id,
      service_name: st.name,
      sale_price: "",
      labor_cost: "",
      products: []
    }]);
    setShowServicePicker(false);
    setServiceSearch("");
  };

  const totals = services.reduce((acc, s) => {
    const prodCost = s.products.reduce((sum, p) => sum + (p.cost_price * p.quantity), 0);
    const cost = prodCost + (parseFloat(s.labor_cost) || 0);
    return {
      sale: acc.sale + (parseFloat(s.sale_price) || 0),
      cost: acc.cost + cost,
    };
  }, { sale: 0, cost: 0 });
  const profit = totals.sale - totals.cost;

  const validate = () => {
    const newErrors = {};
    if (!form.customer_name.trim()) newErrors.customer_name = "El nombre es obligatorio";
    if (!form.customer_phone.trim()) newErrors.customer_phone = "El teléfono es obligatorio";
    if (services.length === 0) newErrors.services = "Agregá al menos un tipo de servicio";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const normalizedServices = services.map(s => ({
        ...s,
        sale_price: parseFloat(s.sale_price) || 0,
        labor_cost: parseFloat(s.labor_cost) || 0,
      }));

      const orderNumber = editId ? undefined : `OS-${Date.now().toString().slice(-6)}`;
      const data = {
        ...form,
        car_year: form.car_year ? parseInt(form.car_year) : null,
        car_mileage: form.car_mileage ? parseFloat(form.car_mileage) : 0,
        services: JSON.stringify(normalizedServices),
        total_sale: totals.sale,
        total_cost: totals.cost,
        profit: profit,
        ...(editId ? {} : { inspection_status: "pending" }),
        ...(orderNumber ? { order_number: orderNumber } : {})
      };

      if (editId) {
        await ServiceOrder.update(editId, data);
      } else {
        for (const svc of services) {
          for (const p of svc.products) {
            if (p.product_id) {
              const prod = await Product.get(p.product_id);
              if (prod) {
                const newStock = Math.max(0, (prod.stock_quantity || 0) - p.quantity);
                await Product.update(p.product_id, { stock_quantity: newStock });
                await StockMovement.create({
                  product_id: p.product_id,
                  product_name: p.product_name,
                  sku: prod.sku || "",
                  movement_type: "sale",
                  quantity: -p.quantity,
                  previous_stock: prod.stock_quantity || 0,
                  new_stock: newStock,
                  reference_type: "sale",
                  reference_number: data.order_number || "",
                  reason: "Orden de servicio",
                });
              }
            }
          }
        }
        await ServiceOrder.create(data);
      }

      navigate(createPageUrl("ServiceOrders"));
    } catch (err) {
      console.error("Error al guardar orden:", err);
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredServiceTypes = serviceTypes.filter(st =>
    st.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const handleQuickApply = (data) => {
    setForm(prev => ({
      ...prev,
      ...(data.entry_date ? { entry_date: data.entry_date } : {}),
      ...(data.appointment_time ? { appointment_time: data.appointment_time } : {}),
      ...(data.customer_name ? { customer_name: data.customer_name } : {}),
      ...(data.customer_phone ? { customer_phone: data.customer_phone } : {}),
      ...(data.car_brand ? { car_brand: data.car_brand } : {}),
      ...(data.car_model ? { car_model: data.car_model } : {}),
      ...(data.car_plate ? { car_plate: data.car_plate.toUpperCase() } : {}),
      ...(data.car_year ? { car_year: data.car_year } : {}),
      ...(data.notes ? { notes: prev.notes ? prev.notes + "\n" + data.notes : data.notes } : {}),
    }));
    if (data.service_name) {
      setServices(prev => [
        ...prev,
        { service_type_id: null, service_name: data.service_name, sale_price: "", labor_cost: "", products: [] }
      ]);
    }
  };

  const canSave = form.customer_name.trim() && form.customer_phone.trim() && services.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("ServiceOrders"))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {editId ? "Editar Orden" : "Nueva Cita"}
          </h1>
          <p className="text-sm text-slate-500">Completá los datos para agendar la cita</p>
        </div>
      </div>

      {/* Quick AI scheduling - only for new orders */}
      {!editId && (
        <QuickScheduleInput onApply={handleQuickApply} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* SECCIÓN 1: Datos de la cita (OBLIGATORIOS) */}
          <div className="bg-white rounded-xl border-2 border-orange-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <div className="w-6 h-6 bg-[#E8461E] rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              Datos de la cita
            </h2>
            <p className="text-xs text-[#E8461E] mb-4 ml-8">Todos los campos de esta sección son obligatorios</p>

            {/* Fecha y hora */}
            <div className="bg-gradient-to-r from-[#E8461E] to-[#E8461E] rounded-xl p-4 mb-4 text-white">
              <p className="text-white/80 text-xs font-medium mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <CalendarDays className="h-3.5 w-3.5" />Fecha y hora de la cita
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/80 text-xs mb-1 block">Fecha</Label>
                  <Input
                    type="date"
                    value={form.entry_date}
                    onChange={e => setForm({ ...form, entry_date: e.target.value })}
                    className="bg-white/20 border-white/30 text-white focus:bg-white/30 h-10 text-sm font-medium"
                  />
                </div>
                <div>
                  <Label className="text-white/80 text-xs mb-1 block flex items-center gap-1">
                    <Clock className="h-3 w-3" />Hora
                  </Label>
                  <div className="flex gap-1.5 items-center">
                    <select
                      value={(form.appointment_time || "09:00").split(":")[0]}
                      onChange={e => {
                        const mins = (form.appointment_time || "09:00").split(":")[1] || "00";
                        setForm({ ...form, appointment_time: `${e.target.value}:${mins}` });
                      }}
                      className="bg-white/20 border border-white/30 text-white rounded-md h-10 text-sm font-bold px-2 focus:outline-none focus:ring-2 focus:ring-white/40 appearance-none text-center w-16"
                    >
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => (
                        <option key={h} value={h} className="text-slate-800">{h}</option>
                      ))}
                    </select>
                    <span className="text-white font-bold text-lg">:</span>
                    <select
                      value={(form.appointment_time || "09:00").split(":")[1] === "30" ? "30" : "00"}
                      onChange={e => {
                        const hrs = (form.appointment_time || "09:00").split(":")[0] || "09";
                        setForm({ ...form, appointment_time: `${hrs}:${e.target.value}` });
                      }}
                      className="bg-white/20 border border-white/30 text-white rounded-md h-10 text-sm font-bold px-2 focus:outline-none focus:ring-2 focus:ring-white/40 appearance-none text-center w-16"
                    >
                      <option value="00" className="text-slate-800">00</option>
                      <option value="30" className="text-slate-800">30</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="text-white/80 text-xs mb-1 block flex items-center gap-1">
                    <Clock className="h-3 w-3" />Entrega Esperada
                  </Label>
                  <Input
                    type="date"
                    value={form.delivery_date}
                    onChange={e => setForm({ ...form, delivery_date: e.target.value })}
                    className="bg-white/20 border-white/30 text-white focus:bg-white/30 h-10 text-sm font-medium"
                  />
                </div>
              </div>
              {form.entry_date && form.appointment_time && (
                <div className="mt-3 bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-white font-semibold text-xs">
                    {new Date(form.entry_date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} a las {form.appointment_time} hs
                  </span>
                </div>
              )}
            </div>

            {/* Nombre y teléfono */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="flex items-center gap-1 mb-1">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Nombre del cliente <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Input
                  value={form.customer_name}
                  onChange={e => { setForm({ ...form, customer_name: e.target.value }); setErrors(p => ({ ...p, customer_name: "" })); }}
                  placeholder="Juan Pérez"
                  className={errors.customer_name ? "border-red-400" : ""}
                />
                {errors.customer_name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.customer_name}</p>}
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  Teléfono <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Input
                  value={form.customer_phone}
                  onChange={e => { setForm({ ...form, customer_phone: e.target.value }); setErrors(p => ({ ...p, customer_phone: "" })); }}
                  placeholder="099 123 456"
                  className={errors.customer_phone ? "border-red-400" : ""}
                />
                {errors.customer_phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.customer_phone}</p>}
              </div>
            </div>

            {/* Servicios */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-slate-400" />
                  Tipo de servicio <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Button size="sm" variant="outline" onClick={() => setShowServicePicker(!showServicePicker)} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />Agregar
                </Button>
              </div>

              {errors.services && <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.services}</p>}

              {showServicePicker && (
                <div className="mb-3 border rounded-xl p-3 bg-slate-50">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Buscar tipo de servicio..."
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredServiceTypes.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2 text-center">Sin tipos de servicio. Creá uno en "Tipos de Servicio".</p>
                    ) : filteredServiceTypes.map(st => (
                      <button key={st.id} onClick={() => { addService(st); setErrors(p => ({ ...p, services: "" })); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-sm font-medium text-slate-700 border border-transparent hover:border-orange-200 transition-colors flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5 text-[#E8461E] shrink-0" />
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {services.length === 0 ? (
                <div className={`text-center py-5 rounded-lg border-2 border-dashed ${errors.services ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
                  <Wrench className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs text-slate-400">Agregá al menos un servicio</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {services.map((svc, i) => (
                    <ServiceCard
                      key={i}
                      service={svc}
                      index={i}
                      products={products}
                      onUpdate={(updated) => setServices(services.map((s, idx) => idx === i ? updated : s))}
                      onRemove={(idx) => setServices(services.filter((_, si) => si !== idx))}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <Label className="mb-1 block">
                Notas / Observaciones
              </Label>
              <Textarea
                value={form.notes}
                onChange={e => { setForm({ ...form, notes: e.target.value }); setErrors(p => ({ ...p, notes: "" })); }}
                placeholder="Describí el problema o pedido del cliente..."
                rows={3}
                className={errors.notes ? "border-red-400" : ""}
              />
              {errors.notes && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.notes}</p>}
            </div>
          </div>

          {/* SECCIÓN 2: Datos del vehículo (OPCIONALES) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center">
                <span className="text-slate-500 text-xs font-bold">2</span>
              </div>
              Datos del vehículo
              <span className="text-xs font-normal text-slate-400 ml-1">(opcional)</span>
            </h2>
            <div className="flex items-center gap-2 mb-4 ml-8 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Car className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">Se completa cuando llega el vehículo al taller</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Patente</Label>
                <Input
                  value={form.car_plate}
                  onChange={e => setForm({ ...form, car_plate: e.target.value.toUpperCase() })}
                  placeholder="ABC 1234"
                  className="uppercase"
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input value={form.car_color} onChange={e => setForm({ ...form, car_color: e.target.value })} placeholder="Blanco" />
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={form.car_brand} onChange={e => setForm({ ...form, car_brand: e.target.value })} placeholder="Toyota" />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={form.car_model} onChange={e => setForm({ ...form, car_model: e.target.value })} placeholder="Corolla" />
              </div>
              <div>
                <Label>Año</Label>
                <Input type="number" value={form.car_year} onChange={e => setForm({ ...form, car_year: e.target.value })} placeholder="2023" />
              </div>
              <div>
                <Label>Kilometraje</Label>
                <Input type="number" value={form.car_mileage} onChange={e => setForm({ ...form, car_mileage: e.target.value })} placeholder="15000" />
              </div>
            </div>
          </div>

          {/* Aviso inspección */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">La inspección se realiza al llegar el auto</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Una vez guardada la orden, podrás hacer la inspección visual y tomar la firma del cliente desde el detalle de la orden.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Resumen */}
        <div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm sticky top-6">
            <h3 className="font-semibold text-slate-800 mb-4">Resumen</h3>

            {(form.entry_date || form.appointment_time) && (
              <div className="bg-[#E8461E]/5 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-[#E8461E] font-medium mb-1 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />Cita agendada
                </p>
                {form.entry_date && (
                  <p className="text-sm font-semibold text-orange-800">
                    {new Date(form.entry_date + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
                {form.appointment_time && (
                  <p className="text-2xl font-bold text-[#c73a15] flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-5 w-5" />{form.appointment_time} hs
                  </p>
                )}
              </div>
            )}

            {form.customer_name && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-500 flex items-center gap-1"><User className="h-3 w-3" />Cliente</p>
                <p className="font-bold text-slate-800">{form.customer_name}</p>
                {form.customer_phone && <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{form.customer_phone}</p>}
                {form.car_plate && <p className="text-xs text-slate-400 mt-1 font-mono">{form.car_plate}</p>}
              </div>
            )}

            {services.length > 0 && (
              <div className="space-y-2 mb-4">
                {services.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600 truncate flex-1 mr-2">{s.service_name}</span>
                    <span className="font-medium text-slate-800 shrink-0">{formatCurrency(s.sale_price)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Total</span>
                <span className="font-bold text-slate-800 text-2xl">{formatCurrency(totals.sale)}</span>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleSave}
              disabled={saving || !canSave}
            >
              {saving ? "Guardando..." : editId ? "Actualizar Orden" : "Crear Cita"}
            </Button>
            <Button variant="outline" className="w-full mt-2"
              onClick={() => navigate(createPageUrl("ServiceOrders"))}>
              Cancelar
            </Button>

            {!canSave && (
              <p className="text-xs text-slate-400 text-center mt-2">
                Completá nombre, teléfono, servicio y notas
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}