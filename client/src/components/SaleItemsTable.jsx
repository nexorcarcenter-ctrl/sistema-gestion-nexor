import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../context/LanguageContext";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function SaleItemsTable({ items, label }) {
  const { t } = useLanguage();
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-sm">{label || t("items")}</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full">
          <thead className="text-xs text-slate-500 uppercase border-b">
            <tr><th className="text-left py-2">{t("product")}</th><th className="text-center py-2">{t("qty")}</th><th className="text-right py-2">{t("price")}</th><th className="text-right py-2">{t("total")}</th></tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3"><p className="font-medium text-slate-900">{item.product_name || item.name}</p><p className="text-xs text-slate-500">{item.sku}</p></td>
                <td className="text-center text-slate-700">{item.quantity}</td>
                <td className="text-right text-slate-700">{fmt(item.unit_price || item.unit_cost)}</td>
                <td className="text-right font-medium text-slate-900">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
