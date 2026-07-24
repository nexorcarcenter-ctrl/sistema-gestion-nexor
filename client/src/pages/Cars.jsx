import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Car } from "@/entities/Car";
import { Supplier } from "@/entities/Supplier";
import { Search, Plus, Car as CarIcon, Edit2, Trash2, Fuel, Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CarForm from "../components/CarForm";
import { useLanguage } from "../context/LanguageContext";

const STATUS_COLORS = {
  available: "bg-emerald-100 text-emerald-700",
  reserved: "bg-amber-100 text-amber-700",
  sold: "bg-slate-100 text-slate-600",
  in_repair: "bg-red-100 text-red-700",
};

export default function Cars() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editCar, setEditCar] = useState(null);

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["cars"],
    queryFn: () => Car.list("-createdAt", 500),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => Supplier.filter({ is_active: true }, "name", 100),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editCar ? Car.update(editCar.id, data) : Car.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cars"] }); setShowForm(false); setEditCar(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => Car.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });

  const openNew = () => { setEditCar(null); setShowForm(true); };
  const openEdit = (car) => { setEditCar(car); setShowForm(true); };

  const filtered = useMemo(() => cars.filter((c) => {
    const matchSearch = !search ||
      c.brand?.toLowerCase().includes(search.toLowerCase()) ||
      c.model?.toLowerCase().includes(search.toLowerCase()) ||
      c.plate?.toLowerCase().includes(search.toLowerCase()) ||
      c.vin?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  }), [cars, search, statusFilter]);

  const stats = {
    total: cars.length,
    available: cars.filter((c) => c.status === "available").length,
    sold: cars.filter((c) => c.status === "sold").length,
    reserved: cars.filter((c) => c.status === "reserved").length,
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("cars")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("carsSubtitle")}</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />{t("addCar")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("carTotal"), value: stats.total, color: "text-slate-900" },
          { label: t("carStatus_available"), value: stats.available, color: "text-emerald-600" },
          { label: t("carStatus_reserved"), value: stats.reserved, color: "text-amber-600" },
          { label: t("carStatus_sold"), value: stats.sold, color: "text-slate-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-slate-500 uppercase">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder={t("carSearch")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["all", "available", "reserved", "sold", "in_repair"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? "bg-orange-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
              {s === "all" ? t("all") : t("carStatus_" + s)}
            </button>
          ))}
        </div>
      </div>

      {/* Car Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg">
          <CarIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t("noCarsFound")}</p>
          <Button className="mt-4 bg-orange-600 hover:bg-orange-700" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />{t("addCar")}
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((car) => (
            <div key={car.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 flex items-start justify-between">
                <div>
                  <p className="text-white font-bold text-lg leading-tight">{car.brand} {car.model}</p>
                  <p className="text-slate-300 text-sm">{car.year} · {car.color || "—"}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[car.status] || "bg-slate-100 text-slate-600"}`}>
                  {t("carStatus_" + car.status)}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">{t("carPlate")}</p>
                    <p className="font-semibold text-slate-800">{car.plate || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{t("carCondition")}</p>
                    <p className="font-semibold text-slate-800">{t("cond_" + car.condition)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5" />{t("fuel_" + car.fuel_type)}</span>
                  <span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />{(car.mileage || 0).toLocaleString()} km</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">{t("carSalePrice")}</p>
                    <p className="text-lg font-bold text-orange-700">
                      {car.sale_price ? `$${Number(car.sale_price).toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(car)}>
                      <Edit2 className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(car.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editCar ? t("editCar") : t("addCar")}</DialogTitle>
          </DialogHeader>
          <CarForm
            car={editCar}
            suppliers={suppliers}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isSaving={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}