import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sale } from "@/entities/Sale";
import { ArrowLeft, Printer, CreditCard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "../components/StatusBadge";
import SaleItemsTable from "../components/SaleItemsTable";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function SaleDetail() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const saleId = urlParams.get("id");

  const { data: sale, isLoading } = useQuery({ queryKey: ["sale", saleId], queryFn: () => Sale.get(saleId), enabled: !!saleId });
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;
  if (!sale) return <div className="text-center py-12"><p className="text-slate-500">{t("saleNotFound")}</p></div>;

  const items = (() => { try { return JSON.parse(sale.items_json || "[]"); } catch { return []; } })();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">{sale.sale_number}</h1><StatusBadge status={sale.status} /></div>
          <p className="text-sm text-slate-500">{moment(sale.sale_date || sale.createdAt).format("MMMM D, YYYY h:mm A")}</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />{t("printReceipt")}</Button>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SaleItemsTable items={items} />
          {sale.notes && <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-sm">{t("notes")}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">{sale.notes}</p></CardContent></Card>}
        </div>
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">{t("summary")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t("subtotal")}</span><span>{fmt(sale.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t("tax")}</span><span>{fmt(sale.tax_amount)}</span></div>
              {sale.discount_amount > 0 && <div className="flex justify-between text-sm text-red-600"><span>{t("discount")}</span><span>-{fmt(sale.discount_amount)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t pt-3"><span>{t("total")}</span><span className="text-[#E8461E]">{fmt(sale.total)}</span></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">{t("paymentMethod")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4 text-slate-400" /><span className="capitalize">{sale.payment_method?.replace(/_/g, " ")}</span></div>
              <StatusBadge status={sale.payment_status} />
              {sale.payment_method === "cash" && sale.amount_paid && (
                <div className="pt-2 text-sm text-slate-600"><p>{t("received")}: {fmt(sale.amount_paid)}</p><p>{t("change")}: {fmt(sale.change_given)}</p></div>
              )}
            </CardContent>
          </Card>
          {sale.customer_name && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("customer")}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /><span className="text-sm">{sale.customer_name}</span></div>
                {sale.customer_phone && <p className="text-sm text-slate-500 ml-6">{sale.customer_phone}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
