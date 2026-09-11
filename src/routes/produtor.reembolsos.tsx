import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PanelCard, ProducerLayout, StatusPill } from "@/components/producer/producer-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl, shortDate } from "@/lib/format";
import { useProducer } from "@/lib/producer-store";

export const Route = createFileRoute("/produtor/reembolsos")({
  head: () => ({
    meta: [
      { title: "Reembolsos — Painel Entrô" },
      { name: "description", content: "Acompanhe os reembolsos automáticos dos seus eventos." },
      { property: "og:title", content: "Reembolsos — Painel Entrô" },
      {
        property: "og:description",
        content: "Regras aplicadas, valores devolvidos e status de cada pedido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProducerRefunds,
});

function ProducerRefunds() {
  const { events, refunds, frozenBalance } = useProducer();
  const [eventId, setEventId] = useState("todos");
  const [status, setStatus] = useState("todos");
  const eventName = (id: string) => events.find((e) => e.id === id)?.name ?? "—";

  const list = refunds.filter(
    (refund) =>
      (eventId === "todos" || refund.eventId === eventId) &&
      (status === "todos" || refund.status === status),
  );

  return (
    <ProducerLayout
      title="Reembolsos"
      description="Os reembolsos seguem as regras da Entrô e acontecem automaticamente. Aqui você só acompanha."
    >
      {frozenBalance > 0 ? (
        <div className="mb-4 rounded-2xl border-2 border-foreground bg-sun p-4 text-ink shadow-pop">
          <p className="font-display text-base font-extrabold">
            Dinheiro congelado por evento cancelado
          </p>
          <p className="mt-1 text-sm">
            {brl(frozenBalance)} saíram do seu saldo e estão sendo devolvidos para quem comprou.
          </p>
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-56">
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger aria-label="Filtrar por evento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os eventos</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="Processando">Processando</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Recusado">Recusado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PanelCard>
        <div className="space-y-3">
          {list.map((refund) => (
            <div key={refund.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-base font-extrabold">{refund.buyer}</p>
                <StatusPill status={refund.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {eventName(refund.eventId)} · {refund.ticket}
              </p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <p>
                  Compra:{" "}
                  <span className="font-semibold text-foreground">
                    {shortDate(refund.purchasedAt)}
                  </span>
                </p>
                <p>
                  Pedido:{" "}
                  <span className="font-semibold text-foreground">
                    {shortDate(refund.requestedAt)}
                  </span>
                </p>
                <p>
                  Regra: <span className="font-semibold text-foreground">{refund.rule}</span>
                </p>
                <p>
                  Devolvido:{" "}
                  <span className="font-semibold text-foreground">{brl(refund.amount)}</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Motivo: {refund.reason}</p>
            </div>
          ))}
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum reembolso com esses filtros.</p>
          ) : null}
        </div>
      </PanelCard>
    </ProducerLayout>
  );
}
