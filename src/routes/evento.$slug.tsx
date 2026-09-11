import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ProducerCta } from "@/components/producer-cta";
import { useAuth } from "@/lib/auth";
import { EventPageSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { fetchEventBySlug, lotStatus, type PublicEvent } from "@/lib/queries";
import { eventFullDate, eventImage } from "@/data/events";
import { brl } from "@/lib/format";

type TicketTypeRow = Tables<"ticket_types">;
type EventWithTicketTypes = PublicEvent & { ticket_types?: TicketTypeRow[] };

const searchSchema = z.object({ ref: z.string().catch(""), promo: z.string().catch("") });

export const Route = createFileRoute("/evento/$slug")({
  validateSearch: (search) => searchSchema.parse(search),
  component: EventPage,
});

function EventPage() {
  const { slug } = Route.useParams();
  const { promo } = Route.useSearch();
  const { user } = useAuth();
  const [qty, setQty] = useState<Record<string, number>>({});
  const trackedRef = useRef<string | null>(null);

  const { data: event, isLoading, isError, refetch } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => fetchEventBySlug(slug),
    retry: false,
  });

  useEffect(() => {
    if (!promo || !event?.id) return;
    if (trackedRef.current === `${promo}:${event.id}`) return;
    trackedRef.current = `${promo}:${event.id}`;
    void db.rpc("track_promoter_click", { p_code: promo, p_event_id: event.id }).then(({ error }) => {
      if (error) console.error("track_promoter_click", error.message);
    });
  }, [promo, event?.id]);

  const lots = useMemo(() => [...(event?.lots ?? [])].sort((a, b) => a.sort_order - b.sort_order), [event?.lots]);
  const ticketTypes = (event as EventWithTicketTypes | undefined)?.ticket_types ?? [];
  const ticketTypeName = (ticketTypeId: string) => ticketTypes.find((tt) => tt.id === ticketTypeId)?.name ?? "Ingresso";

  const total = useMemo(() => lots.reduce((sum, lot) => sum + (qty[lot.id] ?? 0) * Number(lot.price), 0), [lots, qty]);
  const fee = total ? Math.max(3.5, total * 0.07) : 0;
  const half = lots.some((lot) => lot.half_price_quota > 0 && (qty[lot.id] ?? 0) > 0);
  const selectedLots = Object.fromEntries(Object.entries(qty).filter(([, value]) => value > 0));
  const checkoutSearch = { event: slug, lots: JSON.stringify(selectedLots), total, half, ref: promo };

  if (isLoading) {
    return (
      <>
        <EventPageSkeleton />
        <ProducerCta />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <ErrorState onRetry={() => refetch()} />
        </div>
        <ProducerCta />
      </>
    );
  }

  if (!event) throw notFound();

  return (
    <>
      <div className="pb-24 lg:pb-0">
        <div className="relative h-[44vh] min-h-80 overflow-hidden bg-ink">
          <img src={eventImage(event)} alt={`Público de ${event.title}`} width={1200} height={800} className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-linear-to-t from-ink via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 text-primary-foreground sm:px-6">
            {event.genre && <span className="rounded-full bg-sun px-3 py-1 text-xs font-extrabold text-ink">{event.genre}</span>}
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-none sm:text-6xl">{event.title}</h1>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="grid gap-4 border-b border-border pb-8 sm:grid-cols-2">
              <Info icon={<CalendarDays />} text={eventFullDate(event)} />
              <Info icon={<MapPin />} text={`${event.venue_name ?? "Local a definir"}${event.city ? " · " + event.city : ""}`} />
              {event.age_rating && <Info icon={<ShieldCheck />} text={`Classificação: ${event.age_rating}`} />}
              {event.producers?.display_name && <Info icon={<Ticket />} text={`Por ${event.producers.display_name}`} />}
            </div>
            <h2 className="mt-8 text-3xl font-bold">Sobre o evento</h2>
            <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{event.description ?? "Em breve mais detalhes sobre este evento."}</p>
            {promo && <p className="mt-5 rounded-lg bg-secondary p-3 text-sm font-semibold">Link de divulgação aplicado: {promo}</p>}
          </div>

          <aside>
            <h2 className="mb-4 text-3xl font-bold">Ingressos</h2>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {lots.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum ingresso disponível no momento.</p>}
              {lots.map((lot) => {
                const status = lotStatus(lot);
                return (
                  <div key={lot.id} className={`p-4 ${status !== "available" ? "opacity-55" : ""}`}>
                    <div className="flex justify-between gap-3">
                      <div>
                        <h3 className={status === "soldout" ? "font-bold line-through" : "font-bold"}>
                          {ticketTypeName(lot.ticket_type_id)} · {lot.name}
                        </h3>
                        {status === "soon" ? (
                          <p className="text-sm text-primary">Em breve</p>
                        ) : status === "soldout" ? (
                          <p className="text-sm text-muted-foreground">Esgotado</p>
                        ) : status === "closed" ? (
                          <p className="text-sm text-muted-foreground">Vendas encerradas</p>
                        ) : (
                          <p className="text-sm">
                            {brl(Number(lot.price))}{" "}
                            <span className="text-muted-foreground">+ {brl(Math.max(3.5, Number(lot.price) * 0.07))} de taxa</span>
                          </p>
                        )}
                        {lot.half_price_quota > 0 && <span className="mt-2 inline-block rounded-full bg-sun px-2 py-1 text-xs font-bold">Meia-entrada</span>}
                      </div>
                      {status === "available" && (
                        <div className="flex h-9 items-center rounded-lg border border-border">
                          <button aria-label="Remover ingresso" className="size-9" onClick={() => setQty((q) => ({ ...q, [lot.id]: Math.max(0, (q[lot.id] ?? 0) - 1) }))}>−</button>
                          <span className="w-7 text-center font-bold">{qty[lot.id] ?? 0}</span>
                          <button aria-label="Adicionar ingresso" className="size-9" onClick={() => setQty((q) => ({ ...q, [lot.id]: Math.min(lot.max_per_order || 5, (q[lot.id] ?? 0) + 1) }))}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 hidden items-center justify-between lg:flex">
              <div>
                <p className="text-xs text-muted-foreground">Total com taxa</p>
                <strong>{brl(total + fee)}</strong>
              </div>
              <CheckoutLink signedIn={!!user} search={checkoutSearch} disabled={!total} />
            </div>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-border bg-background p-4 lg:hidden">
          <div>
            <p className="text-xs text-muted-foreground">Total com taxa</p>
            <strong>{brl(total + fee)}</strong>
          </div>
          <CheckoutLink signedIn={!!user} search={checkoutSearch} disabled={!total} />
        </div>
      </div>
      <ProducerCta />
    </>
  );
}

function CheckoutLink({
  signedIn,
  search,
  disabled,
}: {
  signedIn: boolean;
  search: { event: string; lots: string; total: number; half: boolean; ref: string };
  disabled: boolean;
}) {
  if (disabled) return <Button disabled>Continuar</Button>;
  if (signedIn) {
    return (
      <Button asChild>
        <Link to="/checkout" search={search}>Continuar</Link>
      </Button>
    );
  }
  return (
    <Button asChild>
      <Link to="/entrar" search={{ redirect: "/checkout", event: search.event, total: search.total, half: search.half, ref: search.ref }}>Continuar</Link>
    </Button>
  );
}

function Info({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold">
      <span className="text-primary">{icon}</span>
      {text}
    </div>
  );
}
