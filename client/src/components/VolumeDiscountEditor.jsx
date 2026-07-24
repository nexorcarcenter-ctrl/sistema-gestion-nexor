import { Plus, Trash2, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function VolumeDiscountEditor({ tiers = [], onChange, t }) {
  const add = () => onChange([...tiers, { min_qty: 1, discount_pct: 0 }]);
  const remove = (i) => onChange(tiers.filter((_, idx) => idx !== i));
  const update = (i, k, v) => onChange(tiers.map((tier, idx) => idx === i ? { ...tier, [k]: v } : tier));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{t("volumeDiscounts")}</Label>
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />{t("addTier")}
        </Button>
      </div>
      {tiers.length === 0 && <p className="text-xs text-slate-400">{t("noDiscounts")}</p>}
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1">
            <Input type="number" min={1} value={tier.min_qty} placeholder={t("minQty")}
              onChange={(e) => update(i, "min_qty", parseInt(e.target.value) || 1)} className="h-8 text-sm" />
          </div>
          <span className="text-xs text-slate-400">→</span>
          <div className="flex-1 relative">
            <Input type="number" min={0} max={100} step={0.5} value={tier.discount_pct} placeholder="%"
              onChange={(e) => update(i, "discount_pct", parseFloat(e.target.value) || 0)} className="h-8 text-sm pr-7" />
            <Percent className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(i)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      {tiers.length > 0 && <p className="text-[10px] text-slate-400">{t("volumeDiscountHint")}</p>}
    </div>
  );
}
