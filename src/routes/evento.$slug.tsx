import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { CalendarDays, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { z } from "zod";
import { events } from "@/data/events";
import { Button } from "@/components/ui/button";
import { ProducerCta } from "@/components/producer-cta";
import { useSession } from "@/lib/session";
import { useEffect, useState } from "react";
import { EventPageSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/evento/$slug")({
  validateSearch: (search) => z.object({ ref: z.string().catch("") }).parse(search),
  loader: ({ params }) => {
    const event = events.find((item) => item.slug === params.slug);
    if (!event) throw notFound();
    return event;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Evento"} — Entrô` },
      { name: "description", content: loaderData?.description ?? "Evento não encontrado." },
      { property: "og:title", content: `${loaderData?.name ?? "Evento"} — Entrô` },
      { property: "og:description", content: loaderData?.description ?? "Confira este evento na Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventPage,
});

function EventPage() {
  const event = Route.useLoaderData();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [event.slug]);
  const { ref: search } = Route.useSearch();
  const { signedIn } = useSession();
  const [qty, setQty] = useState<Record<string, number>>({});
  const total = useMemo(() => event.lots.reduce((sum, lot) => sum + (qty[lot.id] ?? 0) * lot.price, 0), [event.lots, qty]);
  const fee = total ? Math.max(3.5, total * 0.07) : 0;
  const half = event.lots.some((lot) => lot.half && (qty[lot.id] ?? 0) > 0);
  const checkoutSearch = { event: event.slug, total, half, ref: search };

  if (loading) {
    return (
      <>
        <EventPageSkeleton />
        <ProducerCta />
      </>
    );
  }

  return (
    <>
      <div className="pb-24 lg:pb-0">
        <div className="relative h-[44vh] min-h-80 overflow-hidden bg-ink">
          <img src={event.image} alt={`Público de ${event.name}`} width={1200} height={800} className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-linear-to-t from-ink via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 text-primary-foreground sm:px-6">
            <span className="rounded-full bg-sun px-3 py-1 text-xs font-extrabold text-ink">{event.genre}</span>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-none sm:text-6xl">{event.name}</h1>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="grid gap-4 border-b border-border pb-8 sm:grid-cols-2">
              <Info icon={<CalendarDays />} text={`${event.date} · ${event.time}`} />
              <Info icon={<MapPin />} text={`${event.venue} · ${event.address}`} />
              <Info icon={<ShieldCheck />} text={`Classificação: ${event.age}`} />
              <Info icon={<Ticket />} text={`Por ${event.producer}`} />
            </div>
            <h2 className="mt-8 text-3xl font-bold">Sobre o evento</h2>
            <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{event.description}</p>
            {search && <p className="mt-5 rounded-lg bg-secondary p-3 text-sm font-semibold">Link de divulgação aplicado: {search}</p>}
          </div>

          <aside>
            <h2 className="mb-4 text-3xl font-bold">Ingressos</h2>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {event.lots.map((lot) => (
                <div key={lot.id} className={`p-4 ${lot.status !== "available" ? "opacity-55" : ""}`}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className={lot.status === "soldout" ? "font-bold line-through" : "font-bold"}>{lot.name}</h3>
                      {lot.status === "soon" ? (
                        <p className="text-sm text-primary">Em breve</p>
                      ) : (
                        <p className="text-sm">
                          R$ {lot.price.toFixed(2).replace(".", ",")}{" "}
                          <span className="text-muted-foreground">+ R$ {Math.max(3.5, lot.price * 0.07).toFixed(2).replace(".", ",")} de taxa</span>
                        </p>
                      )}
                      {lot.half && <span className="mt-2 inline-block rounded-full bg-sun px-2 py-1 text-xs font-bold">Meia-entrada</span>}
                    </div>
                    {lot.status === "available" && (
                      <div className="flex h-9 items-center rounded-lg border border-border">
                        <button aria-label="Remover ingresso" className="size-9" onClick={() => setQty((q) => ({ ...q, [lot.id]: Math.max(0, (q[lot.id] ?? 0) - 1) }))}>−</button>
                        <span className="w-7 text-center font-bold">{qty[lot.id] ?? 0}</span>
                        <button aria-label="Adicionar ingresso" className="size-9" onClick={() => setQty((q) => ({ ...q, [lot.id]: Math.min(5, (q[lot.id] ?? 0) + 1) }))}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 hidden items-center justify-between lg:flex">
              <div>
                <p className="text-xs text-muted-foreground">Total com taxa</p>
                <strong>R$ {(total + fee).toFixed(2).replace(".", ",")}</strong>
              </div>
              <CheckoutLink signedIn={signedIn} search={checkoutSearch} disabled={!total} />
            </div>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-border bg-background p-4 lg:hidden">
          <div>
            <p className="text-xs text-muted-foreground">Total com taxa</p>
            <strong>R$ {(total + fee).toFixed(2).replace(".", ",")}</strong>
          </div>
          <CheckoutLink signedIn={signedIn} search={checkoutSearch} disabled={!total} />
        </div>
      </div>
      <ProducerCta />
    </>
  );
}

function CheckoutLink({ signedIn, search, disabled }: { signedIn: boolean; search: { event: string; total: number; half: boolean; ref: string }; disabled: boolean }) {
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
      <Link to="/entrar" search={{ redirect: "/checkout", ...search }}>Continuar</Link>
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
