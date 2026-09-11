import electronic from "@/assets/event-electronic.jpg";
import pagode from "@/assets/event-pagode.jpg";
import funk from "@/assets/event-funk.jpg";
import sertanejo from "@/assets/event-sertanejo.jpg";

export type TicketLot = { id: string; name: string; price: number; status: "available" | "soldout" | "soon"; half?: boolean };

export type EventItem = {
  slug: string;
  name: string;
  producer: string;
  genre: string;
  dateISO: string;
  date: string;
  day: string;
  month: string;
  weekday: string;
  time: string;
  venue: string;
  address: string;
  neighborhood: string;
  city: string;
  price: number;
  image: string;
  age: string;
  featured: boolean;
  description: string;
  lots: TicketLot[];
};

export const cities = ["Belo Horizonte", "São Paulo", "Rio de Janeiro", "Curitiba", "Brasília", "Salvador"];
export const genreFilters = ["Funk", "Sertanejo", "Eletrônica", "Pagode", "Rap/Trap", "Rock", "Open bar", "Universitária"];
export const priceFilters = ["Até R$ 50", "R$ 50 a 100", "Acima de R$ 100"];
export const dateFilters = [
  { id: "hoje", label: "Hoje" },
  { id: "fds", label: "Fim de semana" },
  { id: "mes", label: "Este mês" },
];

const imageByGenre: Record<string, string> = {
  "Eletrônica": electronic,
  "Pagode": pagode,
  "Funk": funk,
  "Sertanejo": sertanejo,
  "Rap/Trap": funk,
  "Rock": electronic,
  "Open bar": pagode,
  "Universitária": funk,
};

const baseLots = (price: number): TicketLot[] => [
  { id: "pista1", name: "Pista — 1º lote", price, status: "soldout" },
  { id: "pista2", name: "Pista — 2º lote", price: price + 15, status: "available" },
  { id: "meia", name: "Meia-entrada", price: Math.max(20, Math.round(price / 2)), status: "available", half: true },
  { id: "final", name: "Lote final", price: price + 35, status: "soon" },
];

type Raw = [slug: string, name: string, producer: string, genre: string, dateISO: string, time: string, venue: string, neighborhood: string, city: string, price: number, featured?: boolean];

const raw: Raw[] = [
  ["aurora-eletronica", "Aurora Eletrônica", "Coletivo Prisma", "Eletrônica", "2026-09-11", "22:00", "Galpão 54", "Centro", "Belo Horizonte", 55, true],
  ["quintal-do-pagode", "Quintal do Pagode", "Roda Boa Produções", "Pagode", "2026-09-12", "16:00", "Quintal 360", "Santa Tereza", "Belo Horizonte", 35, true],
  ["baile-violeta", "Baile Violeta", "Pulso Produções", "Funk", "2026-09-13", "23:00", "Clube Mirante", "Pampulha", "Belo Horizonte", 45, true],
  ["sertanejo-no-parque", "Sertanejo no Parque", "Horizonte Eventos", "Sertanejo", "2026-10-04", "17:00", "Parque das Mangabeiras", "Mangabeiras", "Belo Horizonte", 80],

  ["fabrica-de-bass", "Fábrica de Bass", "Neon Club", "Eletrônica", "2026-09-12", "23:30", "Galeria Sonora", "Barra Funda", "São Paulo", 90, true],
  ["baile-da-vila", "Baile da Vila", "Vila Som", "Funk", "2026-09-19", "22:00", "Casa Vila", "Vila Madalena", "São Paulo", 50],
  ["trap-paulista", "Trap Paulista", "Alta Frequência", "Rap/Trap", "2026-10-10", "21:00", "Arena Augusta", "Consolação", "São Paulo", 70],
  ["calourada-sampa", "Calourada Sampa", "Liga Universitária", "Universitária", "2026-10-17", "21:00", "Espaço Cidade", "Butantã", "São Paulo", 25],

  ["samba-da-lapa", "Samba da Lapa", "Casa do Samba", "Pagode", "2026-09-13", "15:00", "Arcos da Lapa", "Lapa", "Rio de Janeiro", 30, true],
  ["baile-carioca", "Baile Carioca", "Onda Produções", "Funk", "2026-09-26", "23:00", "Clube da Praia", "Barra da Tijuca", "Rio de Janeiro", 60],
  ["open-bar-tropical", "Open Bar Tropical", "Onda Produções", "Open bar", "2026-11-01", "22:00", "Terraço Atlântico", "Copacabana", "Rio de Janeiro", 120],
  ["rock-na-zona-sul", "Rock na Zona Sul", "Volume Onze", "Rock", "2026-10-18", "20:00", "Garagem 77", "Botafogo", "Rio de Janeiro", 40],

  ["pinheiral-eletronico", "Pinheiral Eletrônico", "Lumina Cultura", "Eletrônica", "2026-09-19", "22:00", "Hangar Sul", "Rebouças", "Curitiba", 75],
  ["sertanejo-do-pinhao", "Sertanejo do Pinhão", "Estrada Real Shows", "Sertanejo", "2026-10-03", "19:00", "Arena Pinhão", "Portão", "Curitiba", 85],
  ["roda-curitibana", "Roda Curitibana", "Roda Boa Produções", "Pagode", "2026-11-15", "15:00", "Praça do Sol", "Batel", "Curitiba", 20, true],
  ["garagem-indie", "Garagem Indie", "Volume Onze", "Rock", "2026-11-21", "20:30", "Casa Tubo", "Água Verde", "Curitiba", 45],

  ["cerrado-eletronico", "Cerrado Eletrônico", "Coletivo Prisma", "Eletrônica", "2026-10-11", "22:00", "Complexo Asa", "Asa Norte", "Brasília", 95],
  ["universitaria-df", "Universitária DF", "Liga Universitária", "Universitária", "2026-09-25", "21:00", "Espaço Campus", "Asa Sul", "Brasília", 25],
  ["trap-do-planalto", "Trap do Planalto", "Alta Frequência", "Rap/Trap", "2026-10-24", "22:00", "Arena Planalto", "Sudoeste", "Brasília", 65],
  ["open-bar-capital", "Open Bar Capital", "Onda Produções", "Open bar", "2026-12-05", "22:00", "Rooftop Central", "Lago Sul", "Brasília", 140],

  ["axe-da-bahia", "Axé da Bahia", "Bahia Produções", "Pagode", "2026-09-12", "17:00", "Casa da Ladeira", "Pelourinho", "Salvador", 40, true],
  ["baile-do-farol", "Baile do Farol", "Pulso Produções", "Funk", "2026-10-09", "23:00", "Arena Farol", "Barra", "Salvador", 55],
  ["sertanejo-litoral", "Sertanejo Litoral", "Estrada Real Shows", "Sertanejo", "2026-11-07", "18:00", "Arena Litoral", "Itapuã", "Salvador", 90],
  ["virada-entro", "Virada Entrô", "Entrô Experiências", "Open bar", "2026-12-31", "21:00", "Mirante do Atlântico", "Ondina", "Salvador", 350, true],
];

const monthShort = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const monthLong = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const events: EventItem[] = raw.map(([slug, name, producer, genre, dateISO, time, venue, neighborhood, city, price, featured]) => {
  const parsed = new Date(`${dateISO}T12:00:00`);
  const day = String(parsed.getDate()).padStart(2, "0");
  return {
    slug,
    name,
    producer,
    genre,
    dateISO,
    date: `${day} de ${monthLong[parsed.getMonth()]!} de ${parsed.getFullYear()}`,
    day,
    month: monthShort[parsed.getMonth()]!,
    weekday: weekdays[parsed.getDay()]!,
    time,
    venue,
    address: `Rua do Rolê, ${Number(day) + 100} — ${neighborhood}`,
    neighborhood,
    city,
    price,
    image: imageByGenre[genre] ?? electronic,
    age: genre === "Universitária" ? "16 anos" : "18 anos",
    featured: featured ?? false,
    description: `Uma noite para viver intensamente ${name}. Música, encontros e uma produção especial em ${city}. Chegue cedo e curta cada momento.`,
    lots: baseLots(price),
  };
});

export const featuredEvents = events.filter((event) => event.featured);
export const findEvent = (slug: string) => events.find((event) => event.slug === slug);

export const priceBucket = (price: number) => (price <= 50 ? priceFilters[0]! : price <= 100 ? priceFilters[1]! : priceFilters[2]!);

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const isToday = (dateISO: string) => {
  const now = startOfDay(new Date());
  return startOfDay(new Date(`${dateISO}T12:00:00`)).getTime() === now.getTime();
};

export const isWeekend = (dateISO: string) => {
  const date = new Date(`${dateISO}T12:00:00`);
  const day = date.getDay();
  if (day !== 5 && day !== 6 && day !== 0) return false;
  const diff = (startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86400000;
  return diff >= 0 && diff <= 7;
};

export const isThisMonth = (dateISO: string) => {
  const date = new Date(`${dateISO}T12:00:00`);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

export type EventFilterState = {
  q: string;
  city: string;
  genres: string[];
  prices: string[];
  when: string;
};

export const emptyFilters: EventFilterState = { q: "", city: "", genres: [], prices: [], when: "" };

export function filterEvents(state: EventFilterState) {
  return events.filter((event) => {
    const haystack = `${event.name} ${event.venue} ${event.genre} ${event.city} ${event.neighborhood}`.toLowerCase();
    if (state.q && !haystack.includes(state.q.toLowerCase())) return false;
    if (state.city && event.city !== state.city) return false;
    if (state.genres.length && !state.genres.includes(event.genre)) return false;
    if (state.prices.length && !state.prices.includes(priceBucket(event.price))) return false;
    if (state.when === "hoje" && !isToday(event.dateISO)) return false;
    if (state.when === "fds" && !isWeekend(event.dateISO)) return false;
    if (state.when === "mes" && !isThisMonth(event.dateISO)) return false;
    if (state.when.startsWith("20") && event.dateISO !== state.when) return false;
    return true;
  }).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

export const countByCity = (city: string) => events.filter((event) => event.city === city).length;
