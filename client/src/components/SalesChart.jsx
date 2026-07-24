import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as RechartsPrimitive from "recharts";
import moment from "moment";

const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } = RechartsPrimitive;

export default function SalesChart({ sales = [], title = "Sales Trend" }) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = moment().subtract(6 - i, "days");
    const dayStr = date.format("YYYY-MM-DD");
    const daySales = sales.filter((s) => {
      const saleDate = moment(s.sale_date || s.createdAt).format("YYYY-MM-DD");
      return saleDate === dayStr && s.status === "completed";
    });
    return {
      day: date.format("ddd"),
      date: date.format("MMM D"),
      total: daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
      count: daySales.length,
    };
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                formatter={(v) => [`$${v.toLocaleString()}`, "Sales"]}
                labelFormatter={(_, p) => p[0]?.payload?.date}
              />
              <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2} fill="url(#salesGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
