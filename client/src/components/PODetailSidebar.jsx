import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function PODetailSidebar({ order }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">{t("orderDetails")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">{t("orderDate")}</span><span>{moment(order.order_date || order.createdAt).format("MMM D, YYYY")}</span></div>
          {order.expected_date && <div className="flex justify-between"><span className="text-slate-500">{t("expectedDate")}</span><span>{moment(order.expected_date).format("MMM D, YYYY")}</span></div>}
          {order.received_date && <div className="flex justify-between"><span className="text-slate-500">{t("received")}</span><span>{moment(order.received_date).format("MMM D, YYYY")}</span></div>}
          <div className="flex justify-between"><span className="text-slate-500">{t("paymentMethod")}</span><StatusBadge status={order.payment_status} /></div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">{t("summary")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-slate-500">{t("subtotal")}</span><span>{fmt(order.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">{t("tax")}</span><span>{fmt(order.tax_amount)}</span></div>
          {order.shipping_cost > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">{t("shipping")}</span><span>{fmt(order.shipping_cost)}</span></div>}
          <div className="flex justify-between text-lg font-bold border-t pt-3"><span>{t("total")}</span><span className="text-[#E8461E]">{fmt(order.total)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
