import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as RechartsPrimitive from "recharts";

const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } = RechartsPrimitive;

const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];

export default function TopProductsChart({ sales = [], title = "Top Products" }) {
  const productSales = {};
  sales.filter((s) => s.status === "completed").forEach((sale) => {
    try {
      const items = JSON.parse(sale.items_json || "[]");
      items.forEach((item) => {
        const key = item.product_name || item.name;
        if (!productSales[key]) productSales[key] = { name: key, revenue: 0, qty: 0 };
        productSales[key].revenue += item.total || 0;
        productSales[key].qty += item.quantity || 0;
      });
    } catch (e) {}
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({ ...p, shortName: p.name.length > 12 ? p.name.slice(0, 12) + "..." : p.name }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {topProducts.length ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="shortName" tick={{ fontSize: 11, fill: "#64748b" }} width={90} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(v) => [`$${v.toLocaleString()}`, "Revenue"]}
                  labelFormatter={(_, p) => p[0]?.payload?.name}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">No sales data yet</p>
        )}
      </CardContent>
    </Card>
  );
}
