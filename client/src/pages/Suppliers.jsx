import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Supplier } from "@/entities/Supplier";
import { Search, Plus, Users, Phone, Mail, Star, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SupplierForm from "../components/SupplierForm";
import { useLanguage } from "../context/LanguageContext";

export default function Suppliers() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editSupplier, setEditSupplier] = useState(null);
  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: () => Supplier.list("name", 500) });

  const saveMutation = useMutation({
    mutationFn: (data) => editSupplier ? Supplier.update(editSupplier.id, data) : Supplier.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setShowForm(false); setEditSupplier(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => Supplier.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const filteredSuppliers = useMemo(() => suppliers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.contact_name?.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("suppliers")}</h1>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { setEditSupplier(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" />{t("addSupplier")}</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder={t("searchSuppliers")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.length ? filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{supplier.name}</h3>
                    {supplier.rating && <div className="flex items-center gap-0.5">{Array.from({ length: supplier.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}</div>}
                  </div>
                  {supplier.contact_name && <p className="text-sm text-slate-500">{supplier.contact_name}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditSupplier(supplier); setShowForm(true); }}><Edit2 className="h-4 w-4 mr-2" />{t("edit")}</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(supplier.id)}><Trash2 className="h-4 w-4 mr-2" />{t("delete")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {supplier.email && <div className="flex items-center gap-2 text-slate-500"><Mail className="h-3.5 w-3.5" /><span className="truncate">{supplier.email}</span></div>}
                {supplier.phone && <div className="flex items-center gap-2 text-slate-500"><Phone className="h-3.5 w-3.5" /><span>{supplier.phone}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                <span className="text-slate-400 capitalize">{supplier.payment_terms?.replace(/_/g, " ")}</span>
                <span className="text-slate-500">{supplier.total_orders || 0} {t("items")}</span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12 bg-white rounded-lg"><Users className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">{t("noSuppliersFound")}</p></div>
        )}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editSupplier ? t("editSupplier") : t("addSupplier")}</DialogTitle></DialogHeader>
          <SupplierForm supplier={editSupplier} onSave={(data) => saveMutation.mutate(data)} onCancel={() => setShowForm(false)} isSaving={saveMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
