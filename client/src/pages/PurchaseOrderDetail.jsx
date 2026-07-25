import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PurchaseOrder } from "@/entities/PurchaseOrder";
import { Product } from "@/entities/Product";
import { StockMovement } from "@/entities/StockMovement";
import { ArrowLeft, CheckCircle, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "../components/StatusBadge";
import SaleItemsTable from "../components/SaleItemsTable";
import PODetailSidebar from "../components/PODetailSidebar";
import { useLanguage } from "../context/LanguageContext";

export default function PurchaseOrderDetail() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  const { data: order, isLoading } = useQuery({ queryKey: ["purchase-order", orderId], queryFn: () => PurchaseOrder.get(orderId), enabled: !!orderId });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => Product.list("name", 500) });

  const updateMutation = useMutation({
    mutationFn: (data) => PurchaseOrder.update(orderId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] }); queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => PurchaseOrder.delete(orderId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }); navigate(-1); },
  });
  const receiveMutation = useMutation({
    mutationFn: async () => {
      const items = JSON.parse(order.items_json || "[]");
      for (const item of items) {
        const product = products.find((p) => p.id === item.product_id);
        if (product) {
          const newStock = (product.stock_quantity || 0) + item.quantity;
          await Product.update(item.product_id, { stock_quantity: newStock, cost_price: item.unit_cost });
          await StockMovement.create({
            product_id: item.product_id, product_name: item.product_name, sku: item.sku, movement_type: "purchase", quantity: item.quantity,
            previous_stock: product.stock_quantity || 0, new_stock: newStock, unit_cost: item.unit_cost,
            reference_type: "purchase_order", reference_number: order.po_number, reason: t("receiveOrder"),
          });
        }
      }
      await PurchaseOrder.update(orderId, { status: "received", received_date: new Date().toISOString().split("T")[0] });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] }); queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }); queryClient.invalidateQueries({ queryKey: ["products"] }); queryClient.invalidateQueries({ queryKey: ["stock-movements"] }); },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;
  if (!order) return <div className="text-center py-12"><p className="text-slate-500">{t("orderNotFound")}</p></div>;
  const items = (() => { try { return JSON.parse(order.items_json || "[]"); } catch { return []; } })();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">{order.po_number}</h1><StatusBadge status={order.status} /></div>
          <p className="text-sm text-slate-500">{order.supplier_name}</p>
        </div>
        {order.status === "draft" && <Button variant="outline" className="text-red-600" onClick={() => deleteMutation.mutate()}><Trash2 className="h-4 w-4 mr-2" />{t("delete")}</Button>}
        {order.status === "draft" && <Button variant="outline" onClick={() => updateMutation.mutate({ status: "sent" })}><Send className="h-4 w-4 mr-2" />{t("sendOrder")}</Button>}
        {["sent", "confirmed"].includes(order.status) && <Button className="bg-[#E8461E] hover:bg-[#c73a15]" onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending}><CheckCircle className="h-4 w-4 mr-2" />{receiveMutation.isPending ? t("receiving") : t("markReceived")}</Button>}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><SaleItemsTable items={items} /></div>
        <PODetailSidebar order={order} />
      </div>
    </div>
  );
}