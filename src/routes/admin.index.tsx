import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AdminLayout, PanelCard, StatCard } from "@/components/admin/admin-layout";
import { ErrorState } from "@/components/error-state";
import { SalesChart } from "@/components/producer/sales-chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/integrations/meu-supabase/client";
import { brl, intBr } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Visão geral — Admin Entrô" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminHome,
});

const periods = [
  { value: "1", label: "Hoje", days: 1 },
  { value: "7", label: "7 dias", days: 7 },
  { value: "30", label: "30 dias", days: 30 },
  { value: "365", label: "Ano", days: 365 },
] as const;

type PaidOrderRow = {
  id: string;
  total: number;
  service_fee: number;
  payment_method: string;
  paid_at: string | null;
  event_id: string;
  events: { title: string; producer_id: string; producers: { display_name: string } | null } | null;
};

function useDashboardData(sinceIso: string) {
  return useQuery({
    queryKey: ["admin-dashboard", sinceIso],
    queryFn: async () => {
      const [
        ordersRes,
        eventsCountRes,
        producersCountRes,
        blockedRes,
        chargebacksRes,
        rejectedRes,
        lotsRes,
      ] = await Promise.all([
        db
          .from("orders")
          .select(
            "id, total, service_fee, payment_method, paid_at, event_id, events(title, producer_id, producers(display_name))",
          )
          .eq("status", "paid")
          .gte("paid_at", sinceIso)
          .order("paid_at", { ascending: false })
          .limit(2000),
        db.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
        db.from("producers").select("id", { count: "exact", head: true }),
        db
          .from("producer_private")
          .select("producer_id", { count: "exact", head: true })
          .eq("is_blocked", true),
        db.from("chargebacks").select("id", { count: "exact", head: true }).eq("status", "open"),
        db
          .from("producer_private")
          .select("producer_id", { count: "exact", head: true })
          .eq("verification_status", "rejected"),
        db.from("lots").select("sold_count"),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (eventsCountRes.error) throw eventsCountRes.error;
      if (producersCountRes.error) throw producersCountRes.error;
      if (blockedRes.error) throw blockedRes.error;
      if (chargebacksRes.error) throw chargebacksRes.error;
      if (rejectedRes.error) throw rejectedRes.error;
      if (lotsRes.error) throw lotsRes.error;

      const orders = (ordersRes.data ?? []) as unknown as PaidOrderRow[];
      const ticketsSold = (lotsRes.data ?? []).reduce((s, l) => s + (l.sold_count ?? 0), 0);

      return {
        orders,
        publishedEvents: eventsCountRes.count ?? 0,
        totalProducers: producersCountRes.count ?? 0,
        blockedProducers: blockedRes.count ?? 0,
        openChargebacks: chargebacksRes.count ?? 0,
        rejectedVerification: rejectedRes.count ?? 0,
        ticketsSold,
      };
    },
  });
}

function AdminHome() {
  const [period, setPeriod] = useState<string>("30");
  const days = periods.find((p) => p.value === period)?.days ?? 30;
  const sinceIso = useMemo(() => new Date(Date.now() - days * 86400000).toISOString(), [days]);
  const { data, isLoading, isError, refetch } = useDashboardData(sinceIso);

  const stats = useMemo(() => {
    if (!data) return null;
    const orders = data.orders;
    const volume = orders.reduce((s, o) => s + Number(o.total), 0);
    const feeRevenue = orders.reduce((s, o) => s + Number(o.service_fee), 0);
    const pixRevenue = orders
      .filter((o) => o.payment_method === "pix")
      .reduce((s, o) => s + Number(o.service_fee), 0);
    const cardRevenue = orders
      .filter((o) => o.payment_method === "credit_card")
      .reduce((s, o) => s + Number(o.service_fee), 0);

    const byDay = new Map<string, number>();
    for (const o of orders) {
      if (!o.paid_at) continue;
      const key = new Date(o.paid_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      byDay.set(key, (byDay.get(key) ?? 0) + Number(o.total));
    }
    const chartData = Array.from(byDay.entries())
      .map(([label, value]) => ({ label, value }))
      .reverse();

    const byProducer = new Map<string, { name: string; volume: number }>();
    const byEvent = new Map<string, { name: string; volume: number }>();
    for (const o of orders) {
      const producerId = o.events?.producer_id ?? "—";
      const producerName = o.events?.producers?.display_name ?? "—";
      const current = byProducer.get(producerId) ?? { name: producerName, volume: 0 };
      current.volume += Number(o.total);
      byProducer.set(producerId, current);

      const eventName = o.events?.title ?? "—";
      const eventCurrent = byEvent.get(o.event_id) ?? { name: eventName, volume: 0 };
      eventCurrent.volume += Number(o.total);
      byEvent.set(o.event_id, eventCurrent);
    }
    const topProducers = Array.from(byProducer.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
    const topEvents = Array.from(byEvent.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    return { volume, feeRevenue, pixRevenue, cardRevenue, chartData, topProducers, topEvents };
  }, [data]);

  return (
    <AdminLayout
      title="Visão geral"
      description="Números consolidados da plataforma Entrô, calculados a partir do banco."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {periods.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={period === p.value ? "default" : "outline"}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {isError ? (
        <ErrorState
          description="Não conseguimos carregar os números do painel."
          onRetry={() => refetch()}
        />
      ) : isLoading || !data || !stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Volume vendido no período" value={brl(stats.volume)} tone="primary" />
            <StatCard label="Receita de taxas da Entrô" value={brl(stats.feeRevenue)} tone="sun" />
            <StatCard label="Ingressos vendidos (total)" value={intBr(data.ticketsSold)} />
            <StatCard label="Produtores cadastrados" value={intBr(data.totalProducers)} />
            <StatCard label="Produtores bloqueados" value={intBr(data.blockedProducers)} />
            <StatCard label="Eventos publicados" value={intBr(data.publishedEvents)} />
            <StatCard label="Chargebacks em aberto" value={intBr(data.openChargebacks)} />
            <StatCard label="Verificações recusadas" value={intBr(data.rejectedVerification)} />
          </div>

          <PanelCard title="Receita bruta por dia (pedidos pagos)" className="mt-5">
            {stats.chartData.length > 0 ? (
              <SalesChart data={stats.chartData} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma venda paga nesse período ainda.
              </p>
            )}
          </PanelCard>

          <PanelCard title="Receita de taxas por forma de pagamento" className="mt-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Taxa Pix</span>
                <strong>{brl(stats.pixRevenue)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Taxa cartão</span>
                <strong>{brl(stats.cardRevenue)}</strong>
              </div>
            </div>
          </PanelCard>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <PanelCard title="Top produtores por volume">
              <div className="divide-y divide-border text-sm">
                {stats.topProducers.map((p, i) => (
                  <div key={i} className="flex justify-between py-2">
                    <span>{p.name}</span>
                    <strong>{brl(p.volume)}</strong>
                  </div>
                ))}
                {stats.topProducers.length === 0 ? (
                  <p className="py-2 text-muted-foreground">Nenhuma venda no período.</p>
                ) : null}
              </div>
            </PanelCard>
            <PanelCard title="Top eventos por volume">
              <div className="divide-y divide-border text-sm">
                {stats.topEvents.map((e, i) => (
                  <div key={i} className="flex justify-between py-2">
                    <span>{e.name}</span>
                    <strong>{brl(e.volume)}</strong>
                  </div>
                ))}
                {stats.topEvents.length === 0 ? (
                  <p className="py-2 text-muted-foreground">Nenhuma venda no período.</p>
                ) : null}
              </div>
            </PanelCard>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
