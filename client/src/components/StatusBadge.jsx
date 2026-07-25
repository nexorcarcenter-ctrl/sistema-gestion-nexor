import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  completed: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  received: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-[#E8461E]/10 text-[#c73a15]",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
  inactive: "bg-slate-100 text-slate-500",
  discontinued: "bg-slate-100 text-slate-500",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600";
  return (
    <Badge className={`${style} text-[10px] font-medium capitalize`}>
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}
