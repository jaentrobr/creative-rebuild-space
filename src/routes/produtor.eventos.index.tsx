import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, ExternalLink, Pencil, Plus, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PanelCard, ProducerLayout, StatusPill } from "@/components/producer/producer-layout";
import { Button } from "@/components/ui/button";
import { eventCapacity, eventRevenue, eventSold, type EventStatus } from "@/data/producer";
import { brl, shortDateTime } from "@/lib/format";
import { producerActions, useProducer } from "@/lib/producer-store";
import { cn } from "@/lib/utils";
import { PanelListSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/produtor/eventos/")({
  head: () => ({
    meta: [
      { title: "Meus eventos — Painel Entrô" },
      { name: "description", content: "Gerencie rascunhos, eventos publicados e encerrados da sua produtora." },
      { property: "og:title", content: "Meus eventos — Painel Entrô" },
      { property: "og:description", content: "Veja vendas, receita e status de cada evento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProducerEvents,
});

const statuses: (EventStatus | "Todos")[] = ["Todos", "Rascunho", "Publicado", "Encerrado", "Cancelado"];

function ProducerEvents() {
  const { events } = useProducer();
  const [filter, setFilter] = useState<EventStatus | "Todos">("Todos");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [filter]);
  const list = events.filter((event) => filter === "Todos" || event.status === filter);

  return (
    <ProducerLayout
      title="Meus eventos"
      description="Todos os eventos da sua produtora."
      actions={<Button asChild><Link to="/produtor/eventos/novo" search={{ editar: "" }}><Plus className="size-4" /> Criar evento</Link></Button>}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              "rounded-full border-2 border-foreground px-3 py-1.5 text-xs font-bold",
              filter === status ? "bg-foreground text-background" : "bg-background",
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <PanelListSkeleton />
      ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((event) => {
          const sold = eventSold(event.id);
          const capacity = eventCapacity(event.id);
          return (
            <PanelCard key={event.id} className="p-0">
              <img src={event.image} alt={event.name} className="h-36 w-full rounded-t-2xl object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-extrabold">{event.name}</h2>
                    <p className="text-xs text-muted-foreground">{shortDateTime(event.startAt)}</p>
                  </div>
                  <StatusPill status={event.status} />
                </div>
                <div className="mt-3 flex gap-6 text-sm">
                  <p><span className="font-bold">{sold}</span><span className="text-muted-foreground">/{capacity} vendidos</span></p>
                  <p className="font-bold">{brl(eventRevenue(event.id))}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" asChild><Link to="/produtor/eventos/$id" params={{ id: event.id }}><Settings2 className="size-4" /> Gerenciar</Link></Button>
                  <Button size="sm" variant="outline" asChild><Link to="/produtor/eventos/novo" search={{ editar: event.id }}><Pencil className="size-4" /> Editar</Link></Button>
                  <Button size="sm" variant="outline" onClick={() => producerActions.duplicateEvent(event.id)}><Copy className="size-4" /> Duplicar</Button>
                  <Button size="sm" variant="ghost" asChild><Link to="/evento/$slug" params={{ slug: event.slug }} search={{ ref: "" }}><ExternalLink className="size-4" /> Ver página</Link></Button>
                </div>
              </div>
            </PanelCard>
          );
        })}
      </div>
      )}
      {!loading && list.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento com esse status.</p> : null}
    </ProducerLayout>
  );
}
