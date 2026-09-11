import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminLayout, PanelCard, StatCard, StatusPill } from "@/components/admin/admin-layout";
import { SalesChart } from "@/components/producer/sales-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  advances,
  holds,
  platformBalance,
  platformRevenue,
  platformWithdraws,
  producerById,
  eventById,
  revenueByDay,
} from "@/data/admin";
import { csvDownload } from "@/data/producer";
import { brl, shortDate, shortDateTime } from "@/lib/format";
import { useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminFinance,
});

const periods = [
  { value: "7", label: "7 dias", days: 7 },
  { value: "30", label: "30 dias", days: 30 },
  { value: "ano", label: "Ano", days: 365 },
] as const;

function AdminFinance() {
  const { fees } = useAdmin();
  const [period, setPeriod] = useState<string>("30");
  const days = periods.find((p) => p.value === period)?.days ?? 30;
  const filteredDays = useMemo(() => revenueByDay.slice(-days), [days]);
  const revenue = useMemo(() => platformRevenue(fees), [fees]);

  const exportCsv = () => {
    csvDownload(
      "financeiro-entro.csv",
      [
        ["Fonte", "Valor"],
        ["Taxa Pix", revenue.pixFeeRevenue],
        ["Taxa cartão", revenue.cardFeeRevenue],
        ["Adiantamentos", revenue.advanceRevenue],
        ["Margem de antecipação", revenue.anticipationMarginRevenue],
        ["Custo Asaas", revenue.asaasCost],
        ["Lucro", revenue.profit],
      ],
    );
  };

  return (
    <AdminLayout
      title="Financeiro"
      description="Receita, custos e movimentações financeiras da Entrô."
      actions={<Button size="sm" variant="outline" onClick={exportCsv}>Exportar CSV</Button>}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {periods.map((p) => (
          <Button key={p.value} size="sm" variant={period === p.value ? "default" : "outline"} onClick={() => setPeriod(p.value)}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Receita bruta" value={brl(revenue.grossRevenue)} tone="primary" />
        <StatCard label="Custo estimado Asaas" value={brl(revenue.asaasCost)} />
        <StatCard label="Lucro estimado" value={brl(revenue.profit)} tone="sun" />
        <StatCard label="Saldo da conta Entrô" value={brl(platformBalance)} />
      </div>

      <PanelCard title="Receita por período" className="mt-5">
        <SalesChart data={filteredDays.map((d) => ({ label: d.label, value: d.value }))} />
      </PanelCard>

      <PanelCard title="Receita por fonte" className="mt-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Taxa Pix</span><strong>{brl(revenue.pixFeeRevenue)}</strong></div>
          <div className="flex justify-between"><span>Taxa cartão</span><strong>{brl(revenue.cardFeeRevenue)}</strong></div>
          <div className="flex justify-between"><span>Adiantamentos</span><strong>{brl(revenue.advanceRevenue)}</strong></div>
          <div className="flex justify-between"><span>Margem de antecipação</span><strong>{brl(revenue.anticipationMarginRevenue)}</strong></div>
        </div>
      </PanelCard>

      <PanelCard title="Adiantamentos e antecipações" className="mt-5">
        <div className="space-y-2 text-sm">
          {advances.map((a) => {
            const eventHappened = new Date(a.eventDate).getTime() < Date.now();
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="font-semibold">{producerById(a.producerId)?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{eventById(a.eventId)?.name ?? "—"} · Evento em {shortDate(a.eventDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <strong>{brl(a.amount)}</strong>
                  {!eventHappened ? <Badge className="bg-destructive/15 text-destructive">Risco: evento ainda não ocorreu</Badge> : null}
                </div>
              </div>
            );
          })}
        </div>
      </PanelCard>

      <PanelCard title="Retenções ativas (10% por evento)" className="mt-5">
        <div className="space-y-2 text-sm">
          {holds.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span>{producerById(h.producerId)?.name ?? "—"} — {eventById(h.eventId)?.name ?? "—"}</span>
              <div className="flex items-center gap-3">
                <strong>{brl(h.amount)}</strong>
                <span className="text-xs text-muted-foreground">Liberação em {shortDate(h.releaseAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Histórico de saques" className="mt-5">
        <div className="divide-y divide-border text-sm">
          {platformWithdraws.map((w) => (
            <div key={w.id} className="flex justify-between py-2">
              <span>{w.destination} · {shortDateTime(w.date)}</span>
              <strong>{brl(w.amount)}</strong>
            </div>
          ))}
        </div>
      </PanelCard>
    </AdminLayout>
  );
}
