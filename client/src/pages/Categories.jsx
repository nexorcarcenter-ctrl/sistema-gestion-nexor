import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Category } from "@/entities/Category";
import { Search, Plus, Edit2, Trash2, FolderOpen, FolderClosed, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "../context/LanguageContext";

const EMPTY_FORM = { name: "", name_es: "", description: "", color: "#0d9488", sort_order: 0, parent_id: "" };

export default function Categories() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [collapsed, setCollapsed] = useState({});

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => Category.list("sort_order", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editCat ? Category.update(editCat.id, data) : Category.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setShowForm(false); setEditCat(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Category.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const openNew = (parentId = "") => {
    setEditCat(null);
    setForm({ ...EMPTY_FORM, parent_id: parentId });
    setShowForm(true);
  };

  const openEdit = (cat) => {
    setEditCat(cat);
    setForm({
      name: cat.name,
      name_es: cat.nameEs || "",
      description: cat.description || "",
      color: cat.color || "#0d9488",
      sort_order: cat.sortOrder || 0,
      parent_id: cat.parentId || "",
    });
    setShowForm(true);
  };

  const handleDelete = (cat) => {
    const hasChildren = categories.some(c => c.parentId === cat.id);
    if (hasChildren) {
      if (!window.confirm(`"${cat.name}" tiene subcategorías. ¿Eliminar igual? Las subcategorías quedarán sin padre.`)) return;
    }
    deleteMutation.mutate(cat.id);
  };

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // Build tree
  const parents = useMemo(() =>
    categories.filter(c => !c.parentId).filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase())
    ), [categories, search]);

  const getChildren = (parentId) =>
    categories.filter(c => c.parentId === parentId).filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase())
    );

  // Also show orphan subcategories that match search
  const allParentIds = categories.filter(c => !c.parentId).map(c => c.id);
  const orphanSubs = useMemo(() =>
    search ? categories.filter(c => c.parentId && !allParentIds.includes(c.parentId) &&
      c.name.toLowerCase().includes(search.toLowerCase())) : [],
    [categories, search, allParentIds]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("categories")}</h1>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => openNew()}>
          <Plus className="h-4 w-4 mr-2" />{t("addCategory")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tree */}
      <div className="space-y-2">
        {parents.length === 0 && orphanSubs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t("noData")}</p>
          </div>
        ) : (
          <>
            {parents.map(cat => {
              const children = getChildren(cat.id);
              const isOpen = !collapsed[cat.id];
              return (
                <div key={cat.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Parent row */}
                  <div className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors">
                    {/* Collapse toggle */}
                    <button
                      onClick={() => toggleCollapse(cat.id)}
                      className="text-slate-400 hover:text-slate-600 w-5 shrink-0"
                    >
                      {children.length > 0
                        ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)
                        : <span className="w-4 inline-block" />}
                    </button>

                    {/* Color icon */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color || "#0d9488" }}>
                      <FolderOpen className="h-4 w-4 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{cat.name}</p>
                      {cat.description && <p className="text-xs text-slate-500 truncate">{cat.description}</p>}
                      {children.length > 0 && (
                        <p className="text-xs text-orange-600 mt-0.5">{children.length} subcategoría{children.length !== 1 ? "s" : ""}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => openNew(cat.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />Sub
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                        <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(cat)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Children */}
                  {isOpen && children.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50">
                      {children.map((child, idx) => (
                        <div
                          key={child.id}
                          className={`flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 transition-colors ${idx < children.length - 1 ? "border-b border-slate-100" : ""}`}
                        >
                          {/* Indent + connector */}
                          <div className="w-5 shrink-0" />
                          <div className="flex items-center gap-1 text-slate-300 shrink-0">
                            <span className="text-sm">└─</span>
                          </div>

                          {/* Color dot */}
                          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: child.color || cat.color || "#0d9488" }}>
                            <FolderClosed className="h-3.5 w-3.5 text-white" />
                          </div>

                          {/* Info - clickeable para ir a productos */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer group"
                            onClick={() => navigate(createPageUrl("Products") + `?category=${encodeURIComponent(child.name)}`)}
                          >
                            <p className="text-sm font-medium text-slate-800 group-hover:text-orange-600 transition-colors">{child.name}</p>
                            {child.description && <p className="text-xs text-slate-400 truncate">{child.description}</p>}
                            <p className="text-xs text-slate-400 group-hover:text-orange-500 transition-colors">Ver productos →</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(child); }}>
                              <Edit2 className="h-3 w-3 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(child); }}>
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editCat
                ? (editCat.parentId ? "Editar Subcategoría" : t("editCategory"))
                : (form.parent_id ? "Nueva Subcategoría" : t("addCategory"))}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Parent selector */}
            <div>
              <Label>Categoría padre</Label>
              <Select
                value={form.parent_id || "none"}
                onValueChange={(v) => setForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sin padre (categoría raíz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin padre (categoría raíz)</SelectItem>
                  {categories.filter(c => !c.parentId && c.id !== editCat?.id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("name")} (ES) *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>{t("name")} (EN)</Label>
                <Input value={form.name_es} onChange={(e) => setForm(f => ({ ...f, name_es: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>{t("description")}</Label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("color")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="color" value={form.color} onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))} className="w-12 h-9 p-1 cursor-pointer" />
                  <span className="text-sm text-slate-500">{form.color}</span>
                </div>
              </div>
              <div>
                <Label>{t("sortOrder")}</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>{t("cancel")}</Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => saveMutation.mutate({ ...form, parent_id: form.parent_id || null })}
                disabled={!form.name || saveMutation.isPending}
              >
                {saveMutation.isPending ? t("loading") : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}