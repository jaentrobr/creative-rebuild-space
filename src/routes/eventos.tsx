import { createFileRoute } from "@tanstack/react-router";
import { ProducerCta } from "@/components/producer-cta";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { filterEvents, type EventFilterState } from "@/data/events";
import { fetchPublishedEvents } from "@/lib/queries";
import { SearchBar } from "@/components/search-bar";
import { FilterBar } from "@/components/filter-bar";
import { EventCard, EventCardRow } from "@/components/event-card";
import { EventCardGridSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/eventos")({
  validateSearch: (search) =>
    z
      .object({
        q: z.string().catch(""),
        cidade: z.string().catch(""),
        genero: z.string().catch(""),
        quando: z.string().catch(""),
      })
      .parse(search),
  head: () => ({
    meta: [
      { title: "Eventos, festas e shows no Brasil — Entrô" },
      {
        name: "description",
        content: "Busque festas e shows por cidade, gênero, data e preço em todo o Brasil.",
      },
      { property: "og:title", content: "Todos os eventos — Entrô" },
      { property: "og:description", content: "Encontre seu próximo rolê em todo o Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { q, cidade, genero, quando } = Route.useSearch();
  const [state, setState] = useState<EventFilterState>({
    q,
    city: cidade,
    genres: genero ? [genero] : [],
    prices: [],
    when: quando,
  });
  const [visible, setVisible] = useState(10);

  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["public-events"],
    queryFn: fetchPublishedEvents,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    setState({ q, city: cidade, genres: genero ? [genero] : [], prices: [], when: quando });
    setVisible(10);
  }, [q, cidade, genero, quando]);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(events.map((event) => event.city).filter((c): c is string => Boolean(c))),
      ).sort(),
    [events],
  );
  const genres = useMemo(
    () =>
      Array.from(
        new Set(events.map((event) => event.genre).filter((g): g is string => Boolean(g))),
      ).sort(),
    [events],
  );

  const results = useMemo(() => filterEvents(events, state), [events, state]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <h1 className="mb-2 text-4xl font-bold sm:text-5xl">
          {q ? `Resultados para “${q}”` : "Todos os eventos"}
        </h1>
        <p className="mb-6 text-muted-foreground">
          Escolha os filtros e encontre a combinação perfeita.
        </p>
        <div className="mb-6">
          <SearchBar initial={q} />
        </div>
      </div>

      <FilterBar
        state={state}
        onChange={(next) => {
          setState(next);
          setVisible(10);
        }}
        resultCount={results.length}
        cities={cities}
        genres={genres}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <EventCardGridSkeleton />
        ) : results.length ? (
          <>
            <p className="mb-4 text-sm font-semibold text-muted-foreground">
              {results.length} eventos encontrados
            </p>
            <div className="grid grid-cols-1 gap-3 sm:hidden">
              {results.slice(0, visible).map((event) => (
                <EventCardRow key={event.slug} event={event} />
              ))}
            </div>
            <div className="hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {results.slice(0, visible).map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
            {visible < results.length && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={() => setVisible((current) => current + 10)}>
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="my-16 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-secondary text-4xl">
              ✦
            </div>
            <h2 className="mt-5 text-3xl font-bold">Esse rolê ainda não apareceu</h2>
            <p className="mt-2 text-muted-foreground">Tente outro termo ou remova algum filtro.</p>
          </div>
        )}
      </div>
      <ProducerCta />
    </>
  );
}
