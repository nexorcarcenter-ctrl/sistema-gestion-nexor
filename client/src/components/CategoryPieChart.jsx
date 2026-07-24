import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as RechartsPrimitive from "recharts";
import { useLanguage } from "../context/LanguageContext";

const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } = RechartsPrimitive;
const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#0f766e", "#115e59"];

export default function CategoryPieChart({ sales, products }) {
  const { t } = useLanguage();
  const data = useMemo(() => {
    const breakdown = {};
    sales.forEach((s) => {
      try {
        const items = JSON.parse(s.items_json || "[]");
        items.forEach((item) => {
          const product = products.find((p) => p.id === item.product_id);
          const cat = product?.category || "Other";
          if (!breakdown[cat]) breakdown[cat] = 0;
          breakdown[cat] += item.total || 0;
        });
      } catch {}
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [sales, products]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-sm">{t("salesByCategory")}</CardTitle></CardHeader>
      <CardContent>
        {data.length ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-center text-slate-400 py-8">{t("noData")}</p>}
      </CardContent>
    </Card>
  );
}
