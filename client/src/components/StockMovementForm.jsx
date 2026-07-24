import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StockMovement } from "@/entities/StockMovement";
import { Product } from "@/entities/Product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "../context/LanguageContext";

export default function StockMovementForm({ open, onOpenChange, products }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ product_id: "", movement_type: "adjustment", quantity: 0, reason: "" });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const product = products.find((p) => p.id === data.product_id);
      if (!product) return;
      const qty = data.movement_type === "adjustment" ? data.quantity : (["sale", "damage"].includes(data.movement_type) ? -Math.abs(data.quantity) : Math.abs(data.quantity));
      const newStock = Math.max(0, (product.stock_quantity || 0) + qty);
      await Product.update(data.product_id, { stock_quantity: newStock });
      await StockMovement.create({
        product_id: product.id, product_name: product.name, sku: product.sku, movement_type: data.movement_type, quantity: qty,
        previous_stock: product.stock_quantity || 0, new_stock: newStock, reference_type: "manual", reason: data.reason,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock-movements"] }); queryClient.invalidateQueries({ queryKey: ["products"] }); onOpenChange(false); setForm({ product_id: "", movement_type: "adjustment", quantity: 0, reason: "" }); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>{t("recordMovement")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>{t("product")} *</Label>
            <Select value={form.product_id} onValueChange={(v) => setForm((f) => ({ ...f, product_id: v }))}><SelectTrigger><SelectValue placeholder={t("selectProduct")} /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock_quantity})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("type")} *</Label>
              <Select value={form.movement_type} onValueChange={(v) => setForm((f) => ({ ...f, movement_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="adjustment">{t("adjustment")}</SelectItem><SelectItem value="return">{t("return")}</SelectItem><SelectItem value="damage">{t("damage")}</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>{t("quantity")} *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <div><Label>{t("reason")}</Label><Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => createMutation.mutate(form)} disabled={!form.product_id || !form.quantity || createMutation.isPending}>{createMutation.isPending ? t("loading") : t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
