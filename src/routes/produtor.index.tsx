import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, PartyPopper, Plus } from "lucide-react";
import { useMemo } from "react";
import {
  PanelCard,
  ProducerLayout,
  StatCard,
  StatusPill,
} from "@/components/producer/producer-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PanelListSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";
import { brl, shortDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useEventTicketTypes, useProducerEvents, useProducerPrivate } from "@/lib/producer-queries";

export const Route = createFileRoute("/produtor/")({
  head: () => ({
    meta: [
      { title: "Painel do produtor — Entrô" },
      {
        name: "description",
        content: "Acompanhe vendas, saldo e eventos da sua produtora na Entrô.",
      },
    ],
  }),
  component: ProducerHome,
});

function ProducerHome() {
  const { producer } = useAuth();
  const { data: events, isLoading, isError, refetch } = useProducerEvents(producer?.id);
  const { data: verification } = useProducerPrivate(producer?.id);

  if (isLoading) {
    return (
      <ProducerLayout title="Início" description="Como estão suas vendas">
        <PanelListSkeleton />
      </ProducerLayout>
    );
  }

  if (isError) {
    return (
      <ProducerLayout title="Início">
        <ErrorState onRetry={() => void refetch()} />
      </ProducerLayout>
    );
  }

  const list = events ?? [];

  if (list.length === 0) {
    return (
      <ProducerLayout
        title="Bora criar seu primeiro evento?"
        description="Você ainda não tem eventos por aqui."
      >
        <PanelCard className="text-center">
          <PartyPopper className="mx-auto size-10 text-primary" />
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Crie seu evento, monte os lotes e comece a vender em poucos minutos.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/produtor/eventos/novo" search={{ editar: "" }}>
              Criar evento
            </Link>
          </Button>
        </PanelCard>
      </ProducerLayout>
    );
  }

  const upcoming = list
    .filter(
      (event) =>
        event.status === "published" &&
        event.starts_at &&
        new Date(event.starts_at).getTime() > Date.now(),
    )
    .sort((a, b) => +new Date(a.starts_at ?? 0) - +new Date(b.starts_at ?? 0));

  const verified = verification?.verification_status === "approved";

  return (
    <ProducerLayout
      title="Início"
      description="Como estão suas vendas"
      actions={
        <Button asChild>
          <Link to="/produtor/eventos/novo" search={{ editar: "" }}>
            <Plus className="size-4" /> Criar evento
          </Link>
        </Button>
      }
    >
      {!verified ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-foreground bg-sun p-4 text-ink shadow-pop">
          <AlertTriangle className="size-5" />
          <p className="text-sm font-bold">Complete sua verificação para publicar eventos pagos</p>
          <Button size="sm" variant="brand" asChild className="ml-auto">
            <Link to="/produtor/verificacao" search={{ voltar: "" }}>
              Fazer verificação
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Eventos" value={String(list.length)} tone="primary" />
        <StatCard
          label="Publicados"
          value={String(list.filter((e) => e.status === "published").length)}
        />
        <StatCard
          label="Rascunhos"
          value={String(list.filter((e) => e.status === "draft").length)}
        />
      </div>

      <PanelCard title="Próximos eventos" className="mt-5">
        <div className="space-y-4">
          {upcoming.map((event) => (
            <EventProgressRow
              key={event.id}
              eventId={event.id}
              title={event.title}
              status={event.status}
              startsAt={event.starts_at}
              venue={event.venue_name}
            />
          ))}
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum evento publicado com data futura.
            </p>
          ) : null}
        </div>
      </PanelCard>
    </ProducerLayout>
  );
}

function EventProgressRow({
  eventId,
  title,
  status,
  startsAt,
  venue,
}: {
  eventId: string;
  title: string;
  status: string;
  startsAt: string | null;
  venue: string | null;
}) {
  const { data: types } = useEventTicketTypes(eventId);
  const { sold, capacity } = useMemo(() => {
    const lots = (types ?? []).flatMap((t) => t.lots);
    return {
      sold: lots.reduce((s, l) => s + l.sold_count, 0),
      capacity: lots.reduce((s, l) => s + l.quantity, 0) || 1,
    };
  }, [types]);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-base font-extrabold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {startsAt ? shortDateTime(startsAt) : "Data a definir"} · {venue || "local a definir"}
          </p>
        </div>
        <StatusPill status={status} />
      </div>
      <Progress value={(sold / capacity) * 100} className="mt-3" />
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        {sold} de {capacity} ingressos vendidos
      </p>
      <Button size="sm" variant="outline" className="mt-3" asChild>
        <Link to="/produtor/eventos/$id" params={{ id: eventId }}>
          Gerenciar
        </Link>
      </Button>
    </div>
  );
}
