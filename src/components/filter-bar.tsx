import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cities, dateFilters, genreFilters, priceFilters, type EventFilterState } from "@/data/events";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const quickChips = [
  { id: "hoje", label: "Hoje", kind: "when" as const },
  { id: "fds", label: "Fim de semana", kind: "when" as const },
  ...["Funk", "Sertanejo", "Eletrônica", "Pagode", "Rap/Trap", "Open bar", "Universitária"].map((genre) => ({ id: genre, label: genre, kind: "genre" as const })),
];

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary"}`}
    >
      {children}
    </button>
  );
}

export function FilterBar({ state, onChange, resultCount }: { state: EventFilterState; onChange: (next: EventFilterState) => void; resultCount: number }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const activeCount = (state.city ? 1 : 0) + state.genres.length + state.prices.length + (state.when ? 1 : 0);

  const toggleGenre = (genre: string) =>
    onChange({ ...state, genres: state.genres.includes(genre) ? state.genres.filter((item) => item !== genre) : [...state.genres, genre] });
  const togglePrice = (price: string) =>
    onChange({ ...state, prices: state.prices.includes(price) ? state.prices.filter((item) => item !== price) : [...state.prices, price] });
  const setWhen = (when: string) => onChange({ ...state, when: state.when === when ? "" : when });

  return (
    <>
      <div className="sticky top-18 z-40 border-y border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => setOpen(true)}>
            <SlidersHorizontal className="size-4" /> Filtros
            {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{activeCount}</span>}
          </Button>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
            {quickChips.map((chip) => (
              <Chip
                key={chip.id}
                active={chip.kind === "when" ? state.when === chip.id : state.genres.includes(chip.id)}
                onClick={() => (chip.kind === "when" ? setWhen(chip.id) : toggleGenre(chip.id))}
              >
                {chip.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="max-h-[88vh] overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl">Filtros</SheetTitle>
            <SheetDescription>Combine cidade, data, gênero e preço.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 px-4 pb-4">
            <div>
              <p className="mb-2 text-sm font-bold">Cidade</p>
              <div className="flex flex-wrap gap-2">
                <Chip active={!state.city} onClick={() => onChange({ ...state, city: "" })}>Todas as cidades</Chip>
                {cities.map((city) => (
                  <Chip key={city} active={state.city === city} onClick={() => onChange({ ...state, city: state.city === city ? "" : city })}>{city}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Data</p>
              <div className="flex flex-wrap gap-2">
                {dateFilters.map((item) => (
                  <Chip key={item.id} active={state.when === item.id} onClick={() => setWhen(item.id)}>{item.label}</Chip>
                ))}
              </div>
              <label className="mt-3 block text-sm font-semibold">
                Escolher data
                <input
                  type="date"
                  value={state.when.startsWith("20") ? state.when : ""}
                  onChange={(event) => onChange({ ...state, when: event.target.value })}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2"
                />
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Gênero</p>
              <div className="flex flex-wrap gap-2">
                {genreFilters.map((genre) => (
                  <Chip key={genre} active={state.genres.includes(genre)} onClick={() => toggleGenre(genre)}>{genre}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Preço</p>
              <div className="flex flex-wrap gap-2">
                {priceFilters.map((price) => (
                  <Chip key={price} active={state.prices.includes(price)} onClick={() => togglePrice(price)}>{price}</Chip>
                ))}
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background p-4">
            <Button variant="outline" className="gap-2" onClick={() => onChange({ ...state, city: "", genres: [], prices: [], when: "" })}>
              <X className="size-4" /> Limpar
            </Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>Ver {resultCount} eventos</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
