import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = "text-[#E8461E]", bgColor = "bg-[#E8461E]/5" }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <p className={`text-xs mt-1 font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {trend >= 0 ? "+" : ""}{trend}% vs yesterday
              </p>
            )}
          </div>
          {Icon && (
            <div className={`${bgColor} p-3 rounded-xl`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
