import { Badge } from "@/components/ui/badge";

export default function StockBadge({ quantity, minStock = 5 }) {
  if (quantity <= 0) {
    return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
  }
  if (quantity <= minStock) {
    return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Low: {quantity}</Badge>;
  }
  return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{quantity} in stock</Badge>;
}
