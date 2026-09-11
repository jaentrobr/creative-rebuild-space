import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CitySelect } from "@/components/city-select";
import { useSession } from "@/lib/session";
import { eventsSearch } from "@/lib/events-search";

export function SearchBar({ initial = "" }: { initial?: string }) {
  const [term, setTerm] = useState(initial);
  const { city } = useSession();
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ to: "/eventos", search: eventsSearch({ q: term, cidade: city }) });
      }}
      className="flex max-w-3xl flex-col gap-2 rounded-2xl border-2 border-foreground bg-background p-2 shadow-pop sm:flex-row"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <Search className="size-5 shrink-0 text-primary" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Qual vai ser o rolê?"
          className="h-12 border-0 shadow-none focus-visible:ring-0"
        />
      </label>
      <div className="flex h-12 items-center justify-center border-t border-border px-3 sm:h-auto sm:border-l sm:border-t-0">
        <CitySelect />
      </div>
      <Button size="lg" type="submit">
        Buscar
      </Button>
    </form>
  );
}
