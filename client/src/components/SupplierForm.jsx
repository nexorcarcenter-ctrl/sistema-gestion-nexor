import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function SupplierForm({ supplier, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(supplier || { name: "", payment_terms: "net_30" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Company Name *</Label>
          <Input value={form.name || ""} onChange={(e) => update("name", e.target.value)} placeholder="Supplier name" />
        </div>
        <div>
          <Label>Contact Name</Label>
          <Input value={form.contact_name || ""} onChange={(e) => update("contact_name", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>City</Label>
          <Input value={form.city || ""} onChange={(e) => update("city", e.target.value)} />
        </div>
        <div>
          <Label>Payment Terms</Label>
          <Select value={form.payment_terms} onValueChange={(v) => update("payment_terms", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="cod">COD</SelectItem>
              <SelectItem value="net_7">Net 7</SelectItem>
              <SelectItem value="net_15">Net 15</SelectItem>
              <SelectItem value="net_30">Net 30</SelectItem>
              <SelectItem value="net_60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || isSaving} className="bg-orange-600 hover:bg-orange-700">
          {isSaving ? "Saving..." : "Save Supplier"}
        </Button>
      </div>
    </div>
  );
}
