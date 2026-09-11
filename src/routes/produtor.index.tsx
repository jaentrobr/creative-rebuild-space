import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, PartyPopper, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PanelCard, ProducerLayout, StatCard, StatusPill } from "@/components/producer/producer-layout";
import { SalesChart } from "@/components/producer/sales-chart";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { balances, eventCapacity, eventSold, salesByDay } from "@/data/producer";
import { brl, intBr, shortDateTime } from "@/lib/format";
import { useProducer } from "@/lib/producer-store";

export const Route = createFileRoute("/produtor/")({
  head: () => ({
    meta: [
      { title: "Painel do produtor — Entrô" },
      { name: "description", content: "Acompanhe vendas, saldo e eventos da sua produtora na Entrô." },
      { property: "og:title", content: "Painel do produtor — Entrô" },
      { property: "og:description", content: "Vendas, financeiro e gestão de eventos em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProducerHome,
});

const periods = [
  { value: "hoje", label: "Hoje", days: 0 },
  { value: "ontem", label: "Ontem", days: 1 },
  { value: "7", label: "Últimos 7 dias", days: 7 },
  { value: "30", label: "Últimos 30 dias", days: 30 },
  { value: "lifetime", label: "Desde o começo", days: 3650 },
] as const;

function ProducerHome() {
  const { events, verification } = useProducer();
  const [selected, setSelected] = useState("todos");
  const [period, setPeriod] = useState<string>("30");

  const inPeriod = (iso: string) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const time = new Date(iso).getTime();
    if (period === "hoje") return time >= start.getTime();
    if (period === "ontem") return time >= start.getTime() - 86400000 && time < start.getTime();
    const days = period === "lifetime" ? 3650 : Number(period);
    return time >= start.getTime() - (days - 1) * 86400000;
  };

  const filtered = useMemo(
    () => salesByDay.filter((p) => (selected === "todos" || p.eventId === selected) && inPeriod(p.date)),
    [selected, period],
  );

  const periodSales = filtered.reduce((sum, p) => sum + p.value, 0);
  const periodTickets = filtered.reduce((sum, p) => sum + p.tickets, 0);
  const periodLabel = periods.find((p) => p.value === period)?.label ?? "";

  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const point of filtered) {
      grouped.set(point.label, (grouped.get(point.label) ?? 0) + point.value);
    }
    return [...grouped].map(([label, value]) => ({ label, value }));
  }, [filtered]);

  const upcoming = events
    .filter((event) => event.status === "Publicado" && new Date(event.startAt).getTime() > Date.now())
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));

  if (events.length === 0) {
    return (
      <ProducerLayout title="Bora criar seu primeiro evento?" description="Você ainda não tem eventos por aqui.">
        <PanelCard className="text-center">
          <PartyPopper className="mx-auto size-10 text-primary" />
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Crie seu evento, monte os lotes e comece a vender em poucos minutos.</p>
          <Button asChild size="lg" className="mt-6"><Link to="/produtor/eventos/novo" search={{ editar: "" }}>Criar evento</Link></Button>
        </PanelCard>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout
      title="Início"
      description={`Como estão suas vendas · ${periodLabel.toLowerCase()}`}
      selectedEvent={selected}
      onSelectEvent={setSelected}
      actions={<Button asChild><Link to="/produtor/eventos/novo" search={{ editar: "" }}><Plus className="size-4" /> Criar evento</Link></Button>}
    >
      {verification !== "Aprovado" ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-foreground bg-sun p-4 text-ink shadow-pop">
          <AlertTriangle className="size-5" />
          <p className="text-sm font-bold">Complete sua verificação para publicar eventos pagos</p>
          <Button size="sm" variant="brand" asChild className="ml-auto"><Link to="/produtor/verificacao" search={{ voltar: "" }}>Fazer verificação</Link></Button>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {periods.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={period === item.value ? "default" : "outline"}
            onClick={() => setPeriod(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={`Vendas · ${periodLabel}`} value={brl(periodSales)} tone="primary" />
        <StatCard label="Ingressos no período" value={intBr(periodTickets)} />
        <StatCard label="Saldo disponível" value={brl(balances.available)} tone="sun" hint="Pronto para sacar" />
        <StatCard label="A liberar" value={brl(balances.pending)} hint="Pix, 48h úteis após o evento" />
        <StatCard label="Retido para chargeback" value={brl(balances.chargebackHold)} hint="10% do cartão, 30 dias após o evento" />
      </div>

      <PanelCard title="Vendas por dia" className="mt-5">
        <SalesChart data={chartData} />
      </PanelCard>

      <PanelCard title="Próximos eventos" className="mt-5">
        <div className="space-y-4">
          {upcoming.map((event) => {
            const sold = eventSold(event.id);
            const capacity = eventCapacity(event.id) || 1;
            return (
              <div key={event.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-extrabold">{event.name}</p>
                    <p className="text-xs text-muted-foreground">{shortDateTime(event.startAt)} · {event.venue}</p>
                  </div>
                  <StatusPill status={event.status} />
                </div>
                <Progress value={(sold / capacity) * 100} className="mt-3" />
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{sold} de {capacity} ingressos vendidos</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link to="/produtor/eventos/$id" params={{ id: event.id }}>Gerenciar</Link>
                </Button>
              </div>
            );
          })}
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento publicado com data futura.</p> : null}
        </div>
      </PanelCard>
    </ProducerLayout>
  );
}
