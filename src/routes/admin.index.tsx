import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminLayout, PanelCard, StatCard } from "@/components/admin/admin-layout";
import { SalesChart } from "@/components/producer/sales-chart";
import { Button } from "@/components/ui/button";
import {
  chargebacks,
  events as allEvents,
  highSalesAlerts,
  platformRevenue,
  producers as allProducers,
  revenueByDay,
  salesByCity,
} from "@/data/admin";
import { brl, intBr } from "@/lib/format";
import { useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Visão geral — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminHome,
});

const periods = [
  { value: "hoje", label: "Hoje", days: 1 },
  { value: "7", label: "7 dias", days: 7 },
  { value: "30", label: "30 dias", days: 30 },
  { value: "ano", label: "Ano", days: 365 },
] as const;

function AdminHome() {
  const { fees, producers, events } = useAdmin();
  const [period, setPeriod] = useState<string>("30");
  const days = periods.find((p) => p.value === period)?.days ?? 30;

  const filteredDays = useMemo(() => revenueByDay.slice(-days), [days]);
  const revenue = useMemo(() => platformRevenue(fees), [fees]);
  const volumeSold = allEvents.reduce((s, e) => s + e.volume, 0);
  const ticketsSold = allEvents.reduce((s, e) => s + e.ticketsSold, 0);
  const activeProducers = producers.filter((p) => !p.blocked).length;
  const publishedEvents = events.filter((e) => e.status === "Publicado").length;

  const topProducers = [...producers].sort((a, b) => b.volume - a.volume).slice(0, 5);
  const topEvents = [...events].sort((a, b) => b.volume - a.volume).slice(0, 5);
  const openChargebacks = chargebacks.filter((c) => c.status === "Aberto");
  const refusedVerification = producers.filter((p) => p.verification === "Recusado");

  return (
    <AdminLayout title="Visão geral" description="Números consolidados da plataforma Entrô.">
      <div className="mb-4 flex flex-wrap gap-2">
        {periods.map((p) => (
          <Button key={p.value} size="sm" variant={period === p.value ? "default" : "outline"} onClick={() => setPeriod(p.value)}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Volume vendido" value={brl(volumeSold)} tone="primary" />
        <StatCard label="Receita da Entrô" value={brl(revenue.grossRevenue)} />
        <StatCard label="Custo estimado Asaas" value={brl(revenue.asaasCost)} />
        <StatCard label="Lucro estimado" value={brl(revenue.profit)} tone="sun" />
        <StatCard label="Ingressos vendidos" value={intBr(ticketsSold)} />
        <StatCard label="Produtores ativos" value={intBr(activeProducers)} />
        <StatCard label="Eventos publicados" value={intBr(publishedEvents)} />
      </div>

      <PanelCard title="Receita por dia" className="mt-5">
        <SalesChart data={filteredDays.map((d) => ({ label: d.label, value: d.value }))} />
      </PanelCard>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <PanelCard title="Receita por fonte">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Taxa Pix</span><strong>{brl(revenue.pixFeeRevenue)}</strong></div>
            <div className="flex justify-between"><span>Taxa cartão</span><strong>{brl(revenue.cardFeeRevenue)}</strong></div>
            <div className="flex justify-between"><span>Adiantamentos</span><strong>{brl(revenue.advanceRevenue)}</strong></div>
            <div className="flex justify-between"><span>Margem de antecipação</span><strong>{brl(revenue.anticipationMarginRevenue)}</strong></div>
          </div>
        </PanelCard>
        <PanelCard title="Vendas por cidade">
          <div className="space-y-2 text-sm">
            {salesByCity.sort((a, b) => b.volume - a.volume).map((c) => (
              <div key={c.city} className="flex justify-between"><span>{c.city}</span><strong>{brl(c.volume)}</strong></div>
            ))}
          </div>
        </PanelCard>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <PanelCard title="Top produtores por volume">
          <div className="divide-y divide-border text-sm">
            {topProducers.map((p) => (
              <div key={p.id} className="flex justify-between py-2"><span>{p.name}</span><strong>{brl(p.volume)}</strong></div>
            ))}
          </div>
        </PanelCard>
        <PanelCard title="Top eventos por volume">
          <div className="divide-y divide-border text-sm">
            {topEvents.map((e) => (
              <div key={e.id} className="flex justify-between py-2"><span>{e.name}</span><strong>{brl(e.volume)}</strong></div>
            ))}
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Alertas" className="mt-5">
        <div className="space-y-2 text-sm">
          <p><strong>{openChargebacks.length}</strong> chargeback(s) aberto(s) aguardando defesa.</p>
          <p><strong>{refusedVerification.length}</strong> produtor(es) com verificação recusada.</p>
          <p><strong>{highSalesAlerts.length}</strong> evento(s) com vendas altas em menos de 7 dias.</p>
          <p><strong>0</strong> conflito(s) de check-in detectado(s) na portaria.</p>
        </div>
      </PanelCard>
    </AdminLayout>
  );
}
