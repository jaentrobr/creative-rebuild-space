import placeholderImage from "@/assets/event-electronic.jpg";
import { lowestPrice, type PublicEvent } from "@/lib/queries";
import { safeImageSrc } from "@/lib/safe-url";

export type { PublicEvent };

const monthShort = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];
const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function eventDate(event: Pick<PublicEvent, "starts_at">): Date | null {
  return event.starts_at ? new Date(event.starts_at) : null;
}

export function eventDay(event: PublicEvent): string {
  const date = eventDate(event);
  return date ? String(date.getDate()).padStart(2, "0") : "--";
}

export function eventMonth(event: PublicEvent): string {
  const date = eventDate(event);
  return date ? monthShort[date.getMonth()]! : "";
}

export function eventWeekday(event: PublicEvent): string {
  const date = eventDate(event);
  return date ? weekdays[date.getDay()]! : "";
}

export function eventTime(event: PublicEvent): string {
  const date = eventDate(event);
  return date ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
}

export function eventFullDate(event: PublicEvent): string {
  const date = eventDate(event);
  if (!date) return "Data a confirmar";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function eventImage(event: PublicEvent): string {
  return safeImageSrc(event.banner_url) ?? placeholderImage;
}

export function eventPrice(event: PublicEvent): number | null {
  return lowestPrice(event.lots);
}

const startOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const isToday = (isoDate: string | null | undefined): boolean => {
  if (!isoDate) return false;
  return startOfDay(new Date(isoDate)).getTime() === startOfDay(new Date()).getTime();
};

export const isWeekend = (isoDate: string | null | undefined): boolean => {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  const day = date.getDay();
  if (day !== 5 && day !== 6 && day !== 0) return false;
  const diff = (startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86400000;
  return diff >= 0 && diff <= 7;
};

export const isThisMonth = (isoDate: string | null | undefined): boolean => {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

export const priceFilters = ["Até R$ 50", "R$ 50 a 100", "Acima de R$ 100"];

export const dateFilters = [
  { id: "hoje", label: "Hoje" },
  { id: "fds", label: "Fim de semana" },
  { id: "mes", label: "Este mês" },
];

export const priceBucket = (price: number) =>
  price <= 50 ? priceFilters[0]! : price <= 100 ? priceFilters[1]! : priceFilters[2]!;

export type EventFilterState = {
  q: string;
  city: string;
  genres: string[];
  prices: string[];
  when: string;
};

export const emptyFilters: EventFilterState = { q: "", city: "", genres: [], prices: [], when: "" };

/** Filtra eventos reais (vindos do banco) client-side. */
export function filterEvents(events: PublicEvent[], state: EventFilterState): PublicEvent[] {
  return events
    .filter((event) => {
      const haystack =
        `${event.title} ${event.venue_name ?? ""} ${event.genre ?? ""} ${event.city ?? ""} ${event.neighborhood ?? ""}`.toLowerCase();
      if (state.q && !haystack.includes(state.q.toLowerCase())) return false;
      if (state.city && event.city !== state.city) return false;
      if (state.genres.length && !(event.genre && state.genres.includes(event.genre))) return false;
      if (state.prices.length) {
        const price = eventPrice(event);
        if (price == null || !state.prices.includes(priceBucket(price))) return false;
      }
      if (state.when === "hoje" && !isToday(event.starts_at)) return false;
      if (state.when === "fds" && !isWeekend(event.starts_at)) return false;
      if (state.when === "mes" && !isThisMonth(event.starts_at)) return false;
      if (state.when.startsWith("20") && event.starts_at?.slice(0, 10) !== state.when) return false;
      return true;
    })
    .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
}
