import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Expense } from "@/entities/Expense";
import { ExpenseCategory } from "@/entities/ExpenseCategory";
import { PaymentMethod } from "@/entities/PaymentMethod";
import User from "@/entities/User";
import { puedeDarDeBaja, puede } from "@/permissions";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CopyPlus, Edit2, Trash2, Receipt, Repeat, Truck } from "lucide-react";
import ExpenseForm from "../components/ExpenseForm";
import PeriodPicker from "../components/PeriodPicker";
import { rangoDelPeriodo } from "@/entities/Report";
import moment from "moment";

const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-UY")}`;
const esCompra = (g) => g.expense_type === "compra";

const TIPOS = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "operativo", etiqueta: "Operativos" },
  { valor: "compra", etiqueta: "Compras" },
];

export default function Expenses() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState("month");
  const [rango, setRango] = useState(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [aviso, setAviso] = useState("");
  const [tipo, setTipo] = useState("todos");

  const periodo = rango || rangoDelPeriodo(period);

  const { data: gastos = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => Expense.list("-expense_date", 1000),
  });
  const { data: categorias = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => ExpenseCategory.list("sort_order", 100),
  });
  const { data: metodos = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => PaymentMethod.list("name", 50),
  });
  const { data: usuario } = useQuery({ queryKey: ["me"], queryFn: () => User.me() });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["expense-categories"] });
  };

  // Los gastos se filtran acá y no en el servidor: son pocos por mes y así el
  // cambio de período es instantáneo, sin ir y volver.
  const delPeriodo = useMemo(() => gastos.filter((g) => {
    const f = moment(g.expense_date).format("YYYY-MM-DD");
    return f >= periodo.from && f <= periodo.to;
  }), [gastos, periodo.from, periodo.to]);

  // Los subtotales se calculan siempre sobre todo el período, sin importar el
  // filtro: el punto es ver de un vistazo cuánto es de cada tipo.
  const suma = (lista) => lista.reduce((s, g) => s + (Number(g.amount_uyu) || 0), 0);
  const totalCompras = suma(delPeriodo.filter(esCompra));
  const totalOperativos = suma(delPeriodo) - totalCompras;

  const visibles = useMemo(() => delPeriodo.filter((g) =>
    tipo === "todos" || (tipo === "compra" ? esCompra(g) : !esCompra(g))
  ), [delPeriodo, tipo]);
  const total = suma(visibles);

  const porCategoria = useMemo(() => {
    const m = {};
    for (const g of visibles) {
      const k = g.category_name || "Sin categoría";
      m[k] = (m[k] || 0) + (Number(g.amount_uyu) || 0);
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [visibles]);

  const guardar = useMutation({
    mutationFn: async (datos) => {
      if (editando) return Expense.update(editando.id, datos);
      return Expense.create({
        ...datos,
        created_by: usuario?.id || "",
        created_by_name: usuario?.fullName || usuario?.username || "",
      });
    },
    onSuccess: refrescar,
  });

  const borrar = useMutation({
    mutationFn: (id) => Expense.delete(id),
    onSuccess: refrescar,
  });

  // Trae los gastos marcados como fijos del mes anterior. No los inventa: si
  // el mes pasado no se cargó nada, no hay nada que copiar.
  const copiarFijos = useMutation({
    mutationFn: async () => {
      const iniMes = moment(periodo.from).startOf("month");
      const anterior = iniMes.clone().subtract(1, "month");
      const fijos = gastos.filter((g) =>
        g.is_fixed && moment(g.expense_date).isSame(anterior, "month")
      );
      if (fijos.length === 0) {
        setAviso(`No hay gastos fijos cargados en ${anterior.format("MMMM YYYY")}.`);
        return 0;
      }
      // Se compara por categoría, no por descripción: los detalles suelen
      // llevar el mes adentro ("Alquiler local julio"), así que comparar el
      // texto haría copiar de nuevo un alquiler que este mes ya está cargado.
      const yaEstan = new Set(
        gastos.filter((g) => moment(g.expense_date).isSame(iniMes, "month"))
              .map((g) => g.category_id)
      );
      const nuevos = fijos.filter((g) => !yaEstan.has(g.category_id));
      if (nuevos.length === 0) {
        setAviso("Los gastos fijos de este mes ya estaban cargados.");
        return 0;
      }
      for (const g of nuevos) {
        await Expense.create({
          expense_date: iniMes.clone().date(moment(g.expense_date).date()).format("YYYY-MM-DD"),
          category_id: g.category_id, category_name: g.category_name,
          description: g.description, amount: g.amount, currency: g.currency,
          exchange_rate: g.exchange_rate, amount_uyu: g.amount_uyu,
          payment_method_id: g.payment_method_id, payment_method_name: g.payment_method_name,
          supplier_name: g.supplier_name, is_fixed: true, notes: g.notes,
          created_by: usuario?.id || "", created_by_name: usuario?.fullName || usuario?.username || "",
        });
      }
      setAviso(`Se copiaron ${nuevos.length} gasto(s) fijo(s). Revisá los importes antes de darlos por buenos.`);
      return nuevos.length;
    },
    onSuccess: refrescar,
  });

  const puedeBorrar = puedeDarDeBaja(usuario?.role, "expenses");
  const veCompras = puede(usuario?.role, "gestionarCompras");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gastos</h1>
          <p className="text-sm text-slate-500">Gastos de la empresa</p>
        </div>
        <PeriodPicker
          periodo={period}
          rango={rango}
          onChange={({ periodo: p, rango: r }) => { setPeriod(p); setRango(r); setAviso(""); }}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm md:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total del período</p>
            <p className="text-3xl font-bold text-[#E8461E] mt-1">{fmt(total)}</p>
            <p className="text-xs text-slate-500 mt-1">{visibles.length} gasto(s)</p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Gastos operativos</span><span className="font-semibold text-slate-700">{fmt(totalOperativos)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Compras de mercadería</span><span className="font-semibold text-violet-700">{fmt(totalCompras)}</span></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 bg-[#E8461E] hover:bg-[#c73a15]" onClick={() => { setEditando(null); setFormAbierto(true); }}>
                <Plus className="h-4 w-4 mr-1" />Nuevo gasto
              </Button>
            </div>
            <Button
              variant="outline" className="w-full mt-2"
              onClick={() => { setAviso(""); copiarFijos.mutate(); }}
              disabled={copiarFijos.isPending}
            >
              <CopyPlus className="h-4 w-4 mr-1" />
              {copiarFijos.isPending ? "Copiando…" : "Copiar fijos del mes anterior"}
            </Button>
            {aviso && <p className="text-xs text-slate-500 mt-2">{aviso}</p>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm md:col-span-2">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Por categoría</p>
            {porCategoria.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Sin gastos en este período</p>
            ) : (
              <div className="space-y-2">
                {porCategoria.map(([nombre, monto]) => (
                  <div key={nombre}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{nombre}</span>
                      <span className="font-semibold">{fmt(monto)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E8461E] rounded-full" style={{ width: `${total > 0 ? (monto / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {TIPOS.map((x) => (
          <button
            key={x.valor}
            onClick={() => setTipo(x.valor)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tipo === x.valor ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            {x.etiqueta}
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-12 text-slate-400">Cargando…</p>
          ) : visibles.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay gastos cargados en este período</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibles.map((g) => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {g.description || g.category_name || "Sin detalle"}
                      </p>
                      {g.is_fixed && <Repeat className="h-3 w-3 text-slate-400 shrink-0" title="Se repite todos los meses" />}
                      {esCompra(g) && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 shrink-0">Compra</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {[
                        g.category_name,
                        moment(g.expense_date).format("D MMM YYYY"),
                        g.payment_method_name,
                        g.supplier_name,
                        g.created_by_name && `cargó ${g.created_by_name}`,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800">{fmt(g.amount_uyu)}</p>
                    {g.currency === "USD" && (
                      <p className="text-[11px] text-slate-400">US$ {Number(g.amount).toLocaleString("es-UY")}</p>
                    )}
                  </div>
                  {esCompra(g) ? (
                    // El gasto de una compra se cambia desde la compra: así stock, costo y gasto no se desfasan
                    <div className="flex gap-1 shrink-0">
                      {veCompras && g.purchase_order_id && (
                        <Link
                          to={createPageUrl("PurchaseOrderDetail") + "?id=" + g.purchase_order_id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-700 hover:bg-violet-50"
                          title="Ver la compra"
                        >
                          <Truck className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  ) : (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditando(g); setFormAbierto(true); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#c73a15] hover:bg-[#E8461E]/10"
                      title="Editar"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {puedeBorrar && (
                      <button
                        onClick={() => borrar.mutate(g.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseForm
        open={formAbierto}
        onClose={() => { setFormAbierto(false); setEditando(null); }}
        gasto={editando}
        categorias={categorias}
        metodos={metodos}
        onGuardar={(datos) => guardar.mutateAsync(datos)}
        onCategoriaCreada={() => qc.invalidateQueries({ queryKey: ["expense-categories"] })}
      />
    </div>
  );
}
