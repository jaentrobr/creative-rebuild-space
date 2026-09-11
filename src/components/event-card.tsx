import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { PublicEvent } from "@/lib/queries";
import { eventDay, eventMonth, eventImage, eventPrice, eventWeekday } from "@/data/events";
import { brl } from "@/lib/format";

function EventLink({
  event,
  className,
  children,
}: {
  event: PublicEvent;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link to="/evento/$slug" params={{ slug: event.slug }} className={className}>
      {children}
    </Link>
  );
}

function PriceLabel({ event }: { event: PublicEvent }) {
  const price = eventPrice(event);
  if (price == null) return <span className="text-muted-foreground">Em breve</span>;
  return (
    <>
      A partir de <span className="text-primary">{brl(price)}</span>
    </>
  );
}

export function EventCard({ event }: { event: PublicEvent }) {
  return (
    <EventLink
      event={event}
      className="group block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-transform hover:-translate-y-1"
    >
      <div className="aspect-[3/2] overflow-hidden">
        <img
          src={eventImage(event)}
          alt={`Público do evento ${event.title}`}
          loading="lazy"
          width={1200}
          height={800}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex gap-4 p-4">
        <div className="w-12 shrink-0 text-center text-primary">
          <strong className="block font-display text-3xl leading-none">{eventDay(event)}</strong>
          <span className="text-xs font-extrabold">{eventMonth(event)}</span>
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-lg font-bold leading-tight group-hover:text-primary">
            {event.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {event.venue_name ?? "Local a definir"} · {event.city ?? ""}
          </p>
          <p className="mt-3 text-sm font-bold">
            <PriceLabel event={event} />
          </p>
        </div>
      </div>
    </EventLink>
  );
}

export function EventCardCompact({ event }: { event: PublicEvent }) {
  return (
    <EventLink
      event={event}
      className="group block w-[82vw] max-w-[340px] shrink-0 snap-start sm:w-[280px] md:w-[320px]"
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl border-2 border-ink shadow-pop">
        <img
          src={eventImage(event)}
          alt={`Público do evento ${event.title}`}
          loading="lazy"
          width={900}
          height={600}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 grid rounded-xl border-2 border-ink bg-background px-2.5 py-1 text-center leading-none shadow-pop">
          <strong className="font-display text-xl font-extrabold text-primary">
            {eventDay(event)}
          </strong>
          <span className="text-[10px] font-extrabold">{eventMonth(event)}</span>
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-[18px] font-bold leading-tight group-hover:text-primary">
        {event.title}
      </h3>
      <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">
        {eventWeekday(event)}, {eventDay(event)} {eventMonth(event)}
      </p>
      <p className="mt-1 text-base font-extrabold text-primary">
        <PriceLabel event={event} />
      </p>
    </EventLink>
  );
}

export function EventCardRow({ event }: { event: PublicEvent }) {
  return (
    <EventLink event={event} className="flex gap-4 rounded-xl border border-border bg-card p-3">
      <div className="relative h-[110px] w-[110px] shrink-0 overflow-hidden rounded-lg">
        <img
          src={eventImage(event)}
          alt={`Público do evento ${event.title}`}
          loading="lazy"
          width={400}
          height={400}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 py-1">
        <p className="text-xs font-extrabold uppercase text-primary">
          {eventWeekday(event)}, {eventDay(event)} {eventMonth(event)}
        </p>
        <h3 className="line-clamp-2 text-lg font-bold leading-tight">{event.title}</h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {event.venue_name ?? "Local a definir"} · {event.city ?? ""}
        </p>
        <p className="mt-2 text-base font-extrabold text-primary">
          <PriceLabel event={event} />
        </p>
      </div>
    </EventLink>
  );
}
