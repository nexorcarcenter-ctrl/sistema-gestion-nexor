import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as RechartsPrimitive from "recharts";
import { useLanguage } from "../context/LanguageContext";

const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = RechartsPrimitive;
const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];

export default function PaymentPieChart({ sales }) {
  const { t } = useLanguage();
  const data = useMemo(() => {
    const breakdown = {};
    sales.forEach((s) => {
      const method = s.payment_method || "other";
      if (!breakdown[method]) breakdown[method] = 0;
      breakdown[method] += s.total || 0;
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  }, [sales]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-sm">{t("paymentMethods")}</CardTitle></CardHeader>
      <CardContent>
        {data.length ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name }) => name}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-center text-slate-400 py-8">{t("noData")}</p>}
      </CardContent>
    </Card>
  );
}
