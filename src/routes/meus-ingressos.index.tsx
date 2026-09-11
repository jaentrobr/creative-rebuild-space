import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { eventsSearch } from "@/lib/events-search";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/meus-ingressos/")({
  head: () => ({
    meta: [
      { title: "Meus ingressos — Entrô" },
      {
        name: "description",
        content: "Veja seus ingressos próximos e passados, com status e QR code.",
      },
      { property: "og:title", content: "Meus ingressos — Entrô" },
      { property: "og:description", content: "Seus ingressos ficam organizados aqui." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <TicketsPage />
    </RequireAuth>
  ),
});

type TicketWithEvent = Tables<"tickets"> & {
  events: Pick<
    Tables<"events">,
    | "id"
    | "slug"
    | "title"
    | "banner_url"
    | "starts_at"
    | "venue_name"
    | "city"
    | "reschedule_count"
    | "previous_starts_at"
  > | null;
  ticket_types: Pick<Tables<"ticket_types">, "id" | "name"> | null;
  lots: Pick<Tables<"lots">, "id" | "name"> | null;
};

const statusLabel: Record<string, string> = {
  valid: "Válido",
  used: "Utilizado",
  transferred: "Transferido",
  refunded: "Reembolsado",
  canceled: "Cancelado",
};

const statusTone: Record<string, string> = {
  valid: "bg-primary text-primary-foreground",
  used: "bg-secondary text-secondary-foreground",
  transferred: "bg-sun text-ink",
  refunded: "bg-cta text-cta-foreground",
  canceled: "bg-cta text-cta-foreground",
};

function useMyTickets(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-tickets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("tickets")
        .select(
          "*, events(id, slug, title, banner_url, starts_at, venue_name, city, reschedule_count, previous_starts_at), ticket_types(id, name), lots(id, name)",
        )
        .eq("holder_user_id", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TicketWithEvent[];
    },
  });
}

function useRescheduleChoices(ticketIds: string[]) {
  return useQuery({
    queryKey: ["ticket-reschedule-choices", ticketIds],
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      const { data, error } = await db
        .from("ticket_reschedule_choices")
        .select("ticket_id")
        .in("ticket_id", ticketIds);
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.ticket_id));
    },
  });
}

function isRescheduledUpcomingValid(ticket: TicketWithEvent) {
  const event = ticket.events;
  if (!event) return false;
  if (ticket.status !== "valid") return false;
  if ((event.reschedule_count ?? 0) < 1) return false;
  if (!event.starts_at) return false;
  return new Date(event.starts_at).getTime() >= Date.now();
}

function TicketRow({ ticket, needsChoice }: { ticket: TicketWithEvent; needsChoice?: boolean }) {
  const event = ticket.events;
  if (!event) return null;
  const date = event.starts_at ? new Date(event.starts_at) : null;
  return (
    <Link
      to="/meus-ingressos/$id"
      params={{ id: ticket.id }}
      className="flex gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary"
    >
      <img
        src={event.banner_url ?? "/placeholder.svg"}
        alt={event.title}
        loading="lazy"
        width={200}
        height={200}
        className="size-24 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-lg font-bold leading-tight">{event.title}</h2>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone[ticket.status]}`}
          >
            {statusLabel[ticket.status] ?? ticket.status}
          </span>
        </div>
        {isRescheduledUpcomingValid(ticket) && (
          <Badge variant="outline" className="mt-1 border-sun bg-sun/30 text-ink">
            Data alterada
          </Badge>
        )}
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" />
          {date
            ? date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
            : "Data a confirmar"}
        </p>
        <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {event.venue_name ?? ""}
          {event.city ? ` · ${event.city}` : ""}
        </p>
        <p className="mt-1 text-sm font-semibold">
          {ticket.ticket_types?.name ?? "Ingresso"} · {ticket.lots?.name ?? ""} ·{" "}
          {ticket.holder_name}
        </p>
      </div>
    </Link>
  );
}

function TicketsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useMyTickets(user?.id);
  const tickets = data ?? [];
  const now = Date.now();
  const upcoming = tickets.filter(
    (ticket) => ticket.events?.starts_at && new Date(ticket.events.starts_at).getTime() >= now,
  );
  const past = tickets.filter(
    (ticket) => !ticket.events?.starts_at || new Date(ticket.events.starts_at).getTime() < now,
  );

  const rescheduledTicketIds = tickets
    .filter(isRescheduledUpcomingValid)
    .map((ticket) => ticket.id);
  const { data: choices } = useRescheduleChoices(rescheduledTicketIds);
  const hasPendingChoice = rescheduledTicketIds.some((id) => !choices?.has(id));

  return (
    <PageShell className="max-w-3xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Meus ingressos</h1>
      <p className="mt-2 text-muted-foreground">
        Seus ingressos, com status e QR code para entrada.
      </p>

      {hasPendingChoice && (
        <div className="mt-5 rounded-xl border border-sun bg-sun/30 p-4 text-sm font-semibold text-ink">
          Um evento seu mudou de data. Veja suas opções.
        </div>
      )}

      {isLoading && (
        <div className="mt-7 grid gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {isError && !isLoading && (
        <p className="mt-7 rounded-xl bg-secondary p-5 text-sm font-semibold text-destructive">
          Não foi possível carregar seus ingressos. Tente novamente em instantes.
        </p>
      )}

      {!isLoading && !isError && (
        <Tabs defaultValue="proximos" className="mt-7">
          <TabsList className="grid h-11 w-full grid-cols-2">
            <TabsTrigger value="proximos">Próximos</TabsTrigger>
            <TabsTrigger value="passados">Passados</TabsTrigger>
          </TabsList>
          <TabsContent value="proximos" className="mt-5 grid gap-3">
            {upcoming.length ? (
              upcoming.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
            ) : (
              <Empty />
            )}
          </TabsContent>
          <TabsContent value="passados" className="mt-5 grid gap-3">
            {past.length ? (
              past.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
            ) : (
              <Empty />
            )}
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}

function Empty() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
        <Ticket className="size-7 text-primary" />
      </div>
      <p className="mt-4 font-bold">Nada por aqui ainda</p>
      <Button asChild className="mt-5">
        <Link to="/eventos" search={eventsSearch()}>
          Procurar eventos
        </Link>
      </Button>
    </div>
  );
}
