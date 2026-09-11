import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { PublicEvent } from "@/lib/queries";
import { EventCardCompact } from "@/components/event-card";
import { eventsSearch, type EventsSearch } from "@/lib/events-search";

export function EventCarousel({ title, events, viewAll }: { title: string; events: PublicEvent[]; viewAll: Partial<EventsSearch> }) {
  if (!events.length) return null;
  return (
    <section className="py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 sm:px-6">
        <h2 className="min-w-0 truncate text-2xl font-bold sm:text-3xl">{title}</h2>
        <Link to="/eventos" search={eventsSearch(viewAll)} className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary">
          Ver todos <ChevronRight className="size-4" />
        </Link>
      </div>
      <div className="mx-auto mt-4 flex max-w-7xl snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-3 sm:gap-5 sm:scroll-px-6 sm:px-6">
        {events.slice(0, 10).map((event) => <EventCardCompact key={event.slug} event={event} />)}
      </div>
    </section>
  );
}
