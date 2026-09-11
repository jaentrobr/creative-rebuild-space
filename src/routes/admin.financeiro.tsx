import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, PanelCard, StatCard } from "@/components/admin/admin-layout";
import { ErrorState } from "@/components/error-state";
import { SalesChart } from "@/components/producer/sales-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { PROCESS_STATUS_LABELS, csvDownload, fetchProfilesMap } from "@/lib/admin-store";
import { brl, shortDate, shortDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminFinance,
});

const periods = [
  { value: "7", label: "7 dias", days: 7 },
  { value: "30", label: "30 dias", days: 30 },
  { value: "365", label: "Ano", days: 365 },
] as const;

type PaidOrder = { total: number; service_fee: number; payment_method: string; paid_at: string | null };

function useFinance(sinceIso: string) {
  return useQuery({
    queryKey: ["admin-finance", sinceIso],
    queryFn: async () => {
      const [ordersRes, settingsRes, advancesRes, payoutsRes] = await Promise.all([
        db.from("orders").select("total, service_fee, payment_method, paid_at").eq("status", "paid").gte("paid_at", sinceIso).limit(5000),
        db.from("platform_settings").select("*").eq("id", 1).maybeSingle(),
        db.from("advances").select("*, events(title)").order("created_at", { ascending: false }).limit(50),
        db.from("payouts").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (settingsRes.error) throw settingsRes.error;
      if (advancesRes.error) throw advancesRes.error;
      if (payoutsRes.error) throw payoutsRes.error;

      const advances = (advancesRes.data ?? []) as unknown as (Tables<"advances"> & { events: { title: string } | null })[];
      const payouts = payoutsRes.data ?? [];
      const producerIds = Array.from(new Set([...advances.map((a) => a.producer_id), ...payouts.map((p) => p.producer_id)]));
      const producersRes = producerIds.length > 0
        ? await db.from("producers").select("id, display_name").in("id", producerIds)
        : { data: [], error: null };
      if (producersRes.error) throw producersRes.error;
      const producerNames = new Map((producersRes.data ?? []).map((p) => [p.id, p.display_name]));

      return {
        orders: (ordersRes.data ?? []) as PaidOrder[],
        settings: settingsRes.data,
        advances,
        payouts,
        producerNames,
      };
    },
  });
}

function AdminFinance() {
  const [period, setPeriod] = useState<string>("30");
  const days = periods.find((p) => p.value === period)?.days ?? 30;
  const sinceIso = useMemo(() => new Date(Date.now() - days * 86400000).toISOString(), [days]);
  const { data, isLoading, isError, refetch } = useFinance(sinceIso);

  const stats = useMemo(() => {
    if (!data) return null;
    const grossRevenue = data.orders.reduce((s, o) => s + Number(o.total), 0);
    const pixFeeRevenue = data.orders.filter((o) => o.payment_method === "pix").reduce((s, o) => s + Number(o.service_fee), 0);
    const cardFeeRevenue = data.orders.filter((o) => o.payment_method === "credit_card").reduce((s, o) => s + Number(o.service_fee), 0);
    const feeRevenue = pixFeeRevenue + cardFeeRevenue;

    const byDay = new Map<string, number>();
    for (const o of data.orders) {
      if (!o.paid_at) continue;
      const key = new Date(o.paid_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      byDay.set(key, (byDay.get(key) ?? 0) + Number(o.total));
    }
    const chartData = Array.from(byDay.entries()).map(([label, value]) => ({ label, value })).reverse();

    return { grossRevenue, feeRevenue, pixFeeRevenue, cardFeeRevenue, chartData };
  }, [data]);

  const exportCsv = () => {
    if (!stats) return;
    csvDownload("financeiro-entro.csv", [
      ["Fonte", "Valor"],
      ["Receita bruta", stats.grossRevenue],
      ["Taxa Pix", stats.pixFeeRevenue],
      ["Taxa cartão", stats.cardFeeRevenue],
      ["Total de taxas", stats.feeRevenue],
    ]);
  };

  return (
    <AdminLayout
      title="Financeiro"
      description="Receita de taxas, adiantamentos e repasses da Entrô."
      actions={<Button size="sm" variant="outline" onClick={exportCsv} disabled={!stats}>Exportar CSV</Button>}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {periods.map((p) => (
          <Button key={p.value} size="sm" variant={period === p.value ? "default" : "outline"} onClick={() => setPeriod(p.value)}>
            {p.label}
          </Button>
        ))}
      </div>

      {isError ? (
        <ErrorState description="Não conseguimos carregar os dados financeiros." onRetry={() => refetch()} />
      ) : isLoading || !data || !stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Receita bruta (volume pago)" value={brl(stats.grossRevenue)} tone="primary" />
            <StatCard label="Receita de taxas da Entrô" value={brl(stats.feeRevenue)} tone="sun" />
            <StatCard label="Adiantamentos recentes" value={String(data.advances.length)} />
          </div>

          <PanelCard title="Receita bruta por dia" className="mt-5">
            {stats.chartData.length > 0 ? <SalesChart data={stats.chartData} /> : <p className="text-sm text-muted-foreground">Nenhuma venda paga nesse período.</p>}
          </PanelCard>

          <PanelCard title="Receita de taxas por forma de pagamento" className="mt-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Taxa Pix</span><strong>{brl(stats.pixFeeRevenue)}</strong></div>
              <div className="flex justify-between"><span>Taxa cartão</span><strong>{brl(stats.cardFeeRevenue)}</strong></div>
            </div>
          </PanelCard>

          {data.settings ? (
            <PanelCard title="Política de retenção atual" className="mt-5">
              <p className="text-sm text-muted-foreground">
                {(data.settings.retention_percent * 100).toString().replace(".", ",")}% do valor de cada evento fica retido por {data.settings.retention_days} dia(s) após o repasse,
                conforme configurações da plataforma. O saldo consolidado da conta Entrô depende da integração com o gateway de pagamento (fora do escopo deste painel).
              </p>
            </PanelCard>
          ) : null}

          <PanelCard title="Adiantamentos e antecipações" className="mt-5">
            <div className="space-y-2 text-sm">
              {data.advances.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="font-semibold">{data.producerNames.get(a.producer_id) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.events?.title ?? "—"} · Solicitado em {shortDate(a.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>{brl(a.net_amount)}</strong>
                    <Badge variant="secondary">{PROCESS_STATUS_LABELS[a.status]}</Badge>
                  </div>
                </div>
              ))}
              {data.advances.length === 0 ? <p className="text-muted-foreground">Nenhum adiantamento registrado.</p> : null}
            </div>
          </PanelCard>

          <PanelCard title="Histórico de repasses aos produtores" className="mt-5">
            <div className="divide-y divide-border text-sm">
              {data.payouts.map((p) => (
                <div key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{data.producerNames.get(p.producer_id) ?? "—"} · {p.method.toUpperCase()} · {shortDateTime(p.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <strong>{brl(p.amount)}</strong>
                    <Badge variant="secondary">{PROCESS_STATUS_LABELS[p.status]}</Badge>
                  </div>
                </div>
              ))}
              {data.payouts.length === 0 ? <p className="py-2 text-muted-foreground">Nenhum repasse registrado.</p> : null}
            </div>
          </PanelCard>
        </>
      )}
    </AdminLayout>
  );
}
