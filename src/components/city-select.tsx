import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { cities } from "@/data/events";
import { setCity, useSession } from "@/lib/session";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CitySelect({ className = "" }: { className?: string }) {
  const { city } = useSession();
  const [open, setOpen] = useState(false);
  const pick = (value: string) => {
    setCity(value);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={`flex items-center gap-1 text-sm font-bold hover:text-primary ${className}`}>
        <MapPin className="size-4 text-primary" />
        <span className="truncate">{city || "Todas as cidades"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2">
        <button onClick={() => pick(cities[0]!)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-primary hover:bg-secondary">
          <LocateFixed className="size-4" /> Usar minha localização
        </button>
        <div className="my-1 h-px bg-border" />
        <button onClick={() => pick("")} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-secondary ${!city ? "text-primary" : ""}`}>
          Todas as cidades
        </button>
        {cities.map((item) => (
          <button key={item} onClick={() => pick(item)} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-secondary ${city === item ? "text-primary" : ""}`}>
            {item}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
