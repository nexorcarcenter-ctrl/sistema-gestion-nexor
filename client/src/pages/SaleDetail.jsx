import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Credito } from "@/entities/Customer";
import { puede, rolDelToken } from "@/permissions";
import CobroDialog from "../components/CobroDialog";
import { fmtPesos, estadoCobro } from "../components/creditFormat";
import { fmtFecha } from "../components/purchaseFormat";
import { useNavigate } from "react-router-dom";
import { Sale } from "@/entities/Sale";
import { ArrowLeft, Printer, CreditCard, User, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "../components/StatusBadge";
import SaleItemsTable from "../components/SaleItemsTable";
import { useLanguage } from "../context/LanguageContext";
import moment from "moment";

const fmt = (v) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function SaleDetail() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const saleId = urlParams.get("id");

  const queryClient = useQueryClient();
  const [cobrando, setCobrando] = useState(false);
  const [error, setError] = useState("");
  const { data: sale, isLoading } = useQuery({ queryKey: ["sale", saleId], queryFn: () => Sale.get(saleId), enabled: !!saleId });
  const esCredito = sale?.payment_type === "credito";
  // Una venta a crédito se lee con sus cobros (y su id para poder borrarlos)
  const { data: credito } = useQuery({ queryKey: ["sale", saleId, "credito"], queryFn: () => Credito.venta(saleId), enabled: !!saleId && esCredito });
  const refrescar = () => ["sale", "receivables", "credit-customers", "credit-customer", "sales"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  const borrarCobro = useMutation({
    mutationFn: (pagoId) => Credito.borrarCobro(saleId, pagoId),
    onSuccess: (actualizada) => { queryClient.setQueryData(["sale", saleId, "credito"], actualizada); refrescar(); },
    onError: (e) => setError(e.message),
  });
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8461E]" /></div>;
  if (!sale) return <div className="text-center py-12"><p className="text-slate-500">{t("saleNotFound")}</p></div>;

  const items = (() => { try { return JSON.parse(sale.items_json || "[]"); } catch { return []; } })();
  const pagosVenta = (() => { try { return JSON.parse(sale.payments_json || "[]"); } catch { return []; } })();
  const v = credito || sale;
  const saldo = Math.round((Number(v.total) - Number(v.paid_amount || 0)) * 100) / 100;
  const estado = estadoCobro(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">{sale.sale_number}</h1><StatusBadge status={sale.status} /></div>
          <p className="text-sm text-slate-500">{moment(sale.sale_date || sale.createdAt).format("D [de] MMMM [de] YYYY, HH:mm")}</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />{t("printReceipt")}</Button>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SaleItemsTable items={items} />
          {sale.notes && <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-sm">{t("notes")}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">{sale.notes}</p></CardContent></Card>}
        </div>
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">{t("summary")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t("subtotal")}</span><span>{fmt(sale.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t("tax")}</span><span>{fmt(sale.tax_amount)}</span></div>
              {sale.discount_amount > 0 && <div className="flex justify-between text-sm text-red-600"><span>{t("discount")}</span><span>-{fmt(sale.discount_amount)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t pt-3"><span>{t("total")}</span><span className="text-[#E8461E]">{fmt(sale.total)}</span></div>
            </CardContent>
          </Card>
          {esCredito ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Venta a crédito</CardTitle>
                {estado && <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${estado.clase}`}>{estado.etiqueta}</span>}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Plazo</span><span>{v.credit_days} días</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Vence</span><span>{fmtFecha(v.due_date)}</span></div>
                {(credito?.cobros || []).length > 0 && (
                  <div className="border-t pt-2 space-y-1.5">
                    {credito.cobros.map((p) => (
                      <div key={p.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-slate-700">{fmtFecha(p.payment_date)} · {p.payment_method_name || p.payment_method}</p>
                          {p.notes && <p className="text-[11px] text-slate-400 truncate">{p.notes}</p>}
                        </div>
                        <div className="flex items-start gap-1 shrink-0 text-right">
                          <div>
                            <p className="font-medium">{p.currency === "USD" ? `US$ ${Number(p.amount)}` : fmtPesos(p.amount)}</p>
                            {p.currency === "USD" && <p className="text-[11px] text-slate-400">{fmtPesos(p.amount_uyu_equivalent)}</p>}
                          </div>
                          {puede(rolDelToken(), "venderACredito") && (
                            <button onClick={() => borrarCobro.mutate(p.id)} disabled={borrarCobro.isPending} title="Borrar este cobro" className="p-0.5 text-slate-300 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Cobrado</span><span>{fmtPesos(v.paid_amount)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Debe</span><span className={saldo > 0 ? "text-red-600" : "text-emerald-700"}>{fmtPesos(saldo)}</span></div>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                {saldo > 0.009 && (
                  <Button className="w-full bg-[#E8461E] hover:bg-[#c73a15] mt-2" onClick={() => setCobrando(true)}><Wallet className="h-4 w-4 mr-2" />Cobrar</Button>
                )}
                <p className="text-[11px] text-slate-400">Cuenta como ingreso a medida que se cobra.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("paymentMethod")}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {pagosVenta.length ? pagosVenta.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-slate-400" />{p.method_name || p.type}</span>
                    <span>{p.currency === "USD" ? `US$ ${Number(p.amount)}` : fmtPesos(p.amount)}</span>
                  </div>
                )) : (
                  <div className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4 text-slate-400" /><span className="capitalize">{sale.payment_method?.replace(/_/g, " ") || "Sin detalle"}</span></div>
                )}
                <StatusBadge status={sale.payment_status} />
              </CardContent>
            </Card>
          )}
          {sale.customer_name && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">{t("customer")}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /><span className="text-sm">{sale.customer_name}</span></div>
                {sale.customer_phone && <p className="text-sm text-slate-500 ml-6">{sale.customer_phone}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {esCredito && (
        <CobroDialog
          venta={cobrando ? v : null}
          onClose={() => setCobrando(false)}
          // La respuesta ya trae la venta al día: se muestra sin esperar a que se recargue
          onCobrado={(actualizada) => { queryClient.setQueryData(["sale", saleId, "credito"], actualizada); refrescar(); }}
        />
      )}
    </div>
  );
}
