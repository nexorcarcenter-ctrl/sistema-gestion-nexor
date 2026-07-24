import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function ReportSummaryCards({ products, purchaseOrders }) {
  const { t } = useLanguage();
  const inventoryValue = products.reduce((sum, p) => sum + ((Number(p.cost_price) || 0) * (Number(p.stock_quantity) || 0)), 0);
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.min_stock).length;
  const pendingPOValue = purchaseOrders.filter((o) => ["draft", "sent", "confirmed"].includes(o.status)).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const receivedThisMonth = purchaseOrders.filter((o) => o.status === "received" && moment(o.received_date).isSame(moment(), "month")).length;

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">{t("inventorySummary")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center"><span className="text-sm text-slate-500">{t("totalProducts")}</span><span className="font-bold">{products.length}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-slate-500">{t("inventoryValue")}</span><span className="font-bold text-orange-600">{fmt(inventoryValue)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-slate-500">{t("lowStock")}</span><span className="font-bold text-amber-600">{lowStockCount}</span></div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">{t("purchasingSummary")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center"><span className="text-sm text-slate-500">{t("totalPOs")}</span><span className="font-bold">{purchaseOrders.length}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-slate-500">{t("pendingPOValue")}</span><span className="font-bold text-amber-600">{fmt(pendingPOValue)}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-slate-500">{t("receivedThisMonth")}</span><span className="font-bold text-emerald-600">{receivedThisMonth}</span></div>
        </CardContent>
      </Card>
    </>
  );
}
