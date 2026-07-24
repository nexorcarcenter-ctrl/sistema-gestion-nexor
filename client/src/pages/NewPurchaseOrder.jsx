import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { Product } from "@/entities/Product";
import { Supplier } from "@/entities/Supplier";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import POItemsEditor from "../components/POItemsEditor";
import { useLanguage } from "../context/LanguageContext";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function NewPurchaseOrder() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState("");

  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);

  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => Supplier.filter({ is_active: true }, "name", 100) });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => Product.filter({ is_active: true }, "name", 500) });

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const createMutation = useMutation({
    mutationFn: (data) => PurchaseOrder.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }); navigate(createPageUrl("PurchaseOrders")); },
  });

  const handleSubmit = (asDraft = true) => {
    createMutation.mutate({
      po_number: `PO-${Date.now().toString(36).toUpperCase()}`,
      order_date: new Date().toISOString().split("T")[0],
      supplier_id: supplierId, supplier_name: selectedSupplier?.name || "",
      items_json: JSON.stringify(items),
      items_count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal, tax_amount: tax, total,
      status: asDraft ? "draft" : "sent", payment_status: "pending", notes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold text-slate-900">{t("createPO")}</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">{t("supplier")}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><Label>{t("supplier")} *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder={t("selectSupplier")} /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <POItemsEditor products={products} items={items} onItemsChange={setItems} />
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-sm">{t("notes")}</CardTitle></CardHeader><CardContent><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></CardContent></Card>
        </div>
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">{t("orderSummary")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t("items")}</span><span>{items.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t("subtotal")}</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t("tax")} (8%)</span><span>{fmt(tax)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-3"><span>{t("total")}</span><span className="text-orange-600">{fmt(total)}</span></div>
            </CardContent>
          </Card>
          <Button className="w-full" variant="outline" onClick={() => handleSubmit(true)} disabled={!supplierId || !items.length || createMutation.isPending}>{t("saveAsDraft")}</Button>
          <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => handleSubmit(false)} disabled={!supplierId || !items.length || createMutation.isPending}>{t("sendToSupplier")}</Button>
        </div>
      </div>
    </div>
  );
}