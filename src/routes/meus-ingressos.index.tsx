import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { ticketEvent, type DemoTicket } from "@/data/account";
import { eventsSearch } from "@/lib/events-search";

export const Route = createFileRoute("/meus-ingressos/")({
  head: () => ({
    meta: [
      { title: "Meus ingressos — Entrô" },
      { name: "description", content: "Veja seus ingressos próximos e passados, com status e QR code." },
      { property: "og:title", content: "Meus ingressos — Entrô" },
      { property: "og:description", content: "Seus ingressos ficam organizados aqui." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TicketsPage,
});

const statusTone: Record<string, string> = {
  "Válido": "bg-primary text-primary-foreground",
  "Utilizado": "bg-secondary text-secondary-foreground",
  "Transferido": "bg-sun text-ink",
  "Reembolsado": "bg-cta text-cta-foreground",
};

function TicketRow({ ticket }: { ticket: DemoTicket }) {
  const event = ticketEvent(ticket);
  if (!event) return null;
  return (
    <Link to="/meus-ingressos/$id" params={{ id: ticket.id }} className="flex gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary">
      <img src={event.image} alt={event.name} loading="lazy" width={200} height={200} className="size-24 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-lg font-bold leading-tight">{event.name}</h2>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone[ticket.status]}`}>{ticket.status}</span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{event.date} · {event.time}</p>
        <p className="flex items-center gap-1 truncate text-sm text-muted-foreground"><MapPin className="size-3.5" />{event.venue} · {event.city}</p>
        <p className="mt-1 text-sm font-semibold">{ticket.type} · {ticket.lot} · {ticket.holder}</p>
      </div>
    </Link>
  );
}

function TicketsPage() {
  const { tickets } = useSession();
  const now = Date.now();
  const upcoming = tickets.filter((ticket) => new Date(ticket.eventAt).getTime() >= now);
  const past = tickets.filter((ticket) => new Date(ticket.eventAt).getTime() < now);

  return (
    <PageShell className="max-w-3xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Meus ingressos</h1>
      <p className="mt-2 text-muted-foreground">Ingressos de demonstração, com todos os status possíveis.</p>
      <Tabs defaultValue="proximos" className="mt-7">
        <TabsList className="grid h-11 w-full grid-cols-2">
          <TabsTrigger value="proximos">Próximos</TabsTrigger>
          <TabsTrigger value="passados">Passados</TabsTrigger>
        </TabsList>
        <TabsContent value="proximos" className="mt-5 grid gap-3">
          {upcoming.length ? upcoming.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />) : <Empty />}
        </TabsContent>
        <TabsContent value="passados" className="mt-5 grid gap-3">
          {past.length ? past.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />) : <Empty />}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Empty() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary"><Ticket className="size-7 text-primary" /></div>
      <p className="mt-4 font-bold">Nada por aqui ainda</p>
      <Button asChild className="mt-5"><Link to="/eventos" search={eventsSearch()}>Procurar eventos</Link></Button>
    </div>
  );
}
