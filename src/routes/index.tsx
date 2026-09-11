import { createFileRoute, Link } from "@tanstack/react-router";
import { ProducerCta } from "@/components/producer-cta";
import { Disc3, Guitar, Music2, Mic2, PartyPopper, Radio, Sparkles, GraduationCap, QrCode, WifiOff, Send, RotateCcw } from "lucide-react";
import { events, filterEvents, isWeekend, type EventItem } from "@/data/events";
import { cityCards } from "@/data/cities";
import { buyerFaqs } from "@/data/faqs";
import { SearchBar } from "@/components/search-bar";
import { EventCarousel } from "@/components/event-carousel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSession } from "@/lib/session";
import { eventsSearch } from "@/lib/events-search";
import heroDesktop from "@/assets/entro-hero-desktop-v2.png.asset.json";
import heroMobile from "@/assets/entro-hero-mobile-v2.png.asset.json";
import { cityShort } from "@/data/cities";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrô — Ingressos para festas e shows no Brasil" },
      { name: "description", content: "Encontre e compre ingressos para festas, shows e rolês em todo o Brasil." },
      { property: "og:title", content: "Entrô — Seu próximo rolê começa aqui" },
      { property: "og:description", content: "Festas, shows e experiências em 6 cidades do Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const styleBlocks = [
  { genre: "Funk", icon: Radio, tone: "bg-primary text-primary-foreground" },
  { genre: "Eletrônica", icon: Disc3, tone: "bg-cta text-cta-foreground" },
  { genre: "Sertanejo", icon: Guitar, tone: "bg-sun text-ink" },
  { genre: "Pagode", icon: Music2, tone: "bg-cta text-cta-foreground" },
  { genre: "Rap/Trap", icon: Mic2, tone: "bg-sun text-ink" },
  { genre: "Open bar", icon: PartyPopper, tone: "bg-primary text-primary-foreground" },
  { genre: "Rock", icon: Guitar, tone: "bg-sun text-ink" },
  { genre: "Universitária", icon: GraduationCap, tone: "bg-primary text-primary-foreground" },
];

function Index() {
  const { city } = useSession();
  const inCity = (list: EventItem[]) => (city ? list.filter((event) => event.city === city) : list);
  const trending = inCity(events.filter((event) => event.featured));
  const weekend = inCity(events.filter((event) => isWeekend(event.dateISO)));
  const byGenre = (genre: string) => inCity(filterEvents({ ...eventsSearchState, genres: [genre] }));

  return (
    <>
      <section className="relative overflow-hidden bg-background">
        <h1 className="sr-only">Bora pro rolê? Festas, shows e experiências para sair do grupo e entrar na pista.</h1>

        <div className="hidden lg:block">
          <div
            className="absolute inset-y-0 right-0 w-full bg-no-repeat"
            style={{ backgroundImage: `url(${heroDesktop.url})`, backgroundSize: "contain", backgroundPosition: "right center" }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-24">
            <div className="max-w-xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-primary">
                <Sparkles className="size-4" /> O Brasil tá cheio de coisa boa
              </p>
              <p className="font-display text-5xl font-extrabold leading-none text-ink sm:text-7xl">Bora pro rolê?</p>
              <p className="mb-8 mt-4 max-w-md text-lg text-muted-foreground">Festas, shows e experiências para sair do grupo e entrar na pista.</p>
              <SearchBar />
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="relative overflow-hidden">
            <img
              src={heroMobile.url}
              alt="O Brasil tá cheio de coisa boa"
              width={1958}
              height={812}
              className="block h-auto w-full"
              onError={(event) => {
                const target = event.currentTarget;
                target.style.display = "none";
                const placeholder = target.nextElementSibling as HTMLElement | null;
                if (placeholder) placeholder.style.display = "flex";
              }}
            />
            <div className="hidden aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-primary to-cta p-6 text-center text-primary-foreground">
              <p className="font-display text-3xl font-extrabold">O Brasil tá cheio de coisa boa</p>
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <SearchBar />
          </div>
        </div>
      </section>

      <div className="mt-2">
        <EventCarousel title={city ? `Em alta em ${cityShort(city)}` : "Em alta"} events={trending} viewAll={{ cidade: city }} />
        <EventCarousel title="Este fim de semana" events={weekend} viewAll={{ cidade: city, quando: "fds" }} />
        <EventCarousel title="Funk" events={byGenre("Funk")} viewAll={{ cidade: city, genero: "Funk" }} />
        <EventCarousel title="Eletrônica" events={byGenre("Eletrônica")} viewAll={{ cidade: city, genero: "Eletrônica" }} />
        <EventCarousel title="Sertanejo" events={byGenre("Sertanejo")} viewAll={{ cidade: city, genero: "Sertanejo" }} />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-5 flex items-center gap-2">
          <h2 className="text-3xl font-bold sm:text-4xl">Explore por estilo</h2>
          <span className="text-2xl text-sun">✦</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {styleBlocks.map(({ genre, icon: Icon, tone }) => (
            <Link key={genre} to="/eventos" search={eventsSearch({ genero: genre, cidade: city })} className={`flex items-center gap-3 rounded-2xl border-2 border-ink p-4 font-display text-lg font-extrabold shadow-pop transition-transform hover:-translate-y-1 ${tone}`}>
              <Icon className="size-6 shrink-0" />
              <span className="min-w-0 truncate">{genre}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="mb-5 text-3xl font-bold sm:text-4xl">Rolês por cidade</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {cityCards.map((item) => (
              <Link key={item.name} to="/eventos" search={eventsSearch({ cidade: item.name })} className="group relative overflow-hidden rounded-2xl border border-border">
                <img src={item.image} alt={`Rolês em ${item.name}`} loading="lazy" width={800} height={500} className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-44" />
                <div className="absolute inset-0 bg-linear-to-t from-ink/85 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-primary-foreground">
                  <p className="font-display text-xl font-extrabold">{item.name}</p>
                  <p className="text-sm text-primary-foreground/80">{events.filter((event) => event.city === item.name).length} eventos</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div className="relative mx-auto w-64">
          <span className="absolute -left-6 top-4 text-3xl text-cta">ϟ</span>
          <div className="rounded-[2.5rem] border-[6px] border-ink bg-background p-4 shadow-pop-lg">
            <div className="rounded-2xl bg-secondary p-4 text-center">
              <p className="font-display text-lg font-extrabold">Baile Violeta</p>
              <p className="text-xs text-muted-foreground">Clube Mirante · Belo Horizonte</p>
              <div className="mx-auto mt-4 grid size-32 place-items-center rounded-xl border-2 border-ink bg-background">
                <QrCode className="size-24" />
              </div>
              <p className="mt-3 text-xs font-bold">ENTRO-3T8P-1194</p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold sm:text-4xl">Seus ingressos no celular</h2>
          <p className="mt-2 text-muted-foreground">Sem papel, sem fila e sem susto na porta.</p>
          <ul className="mt-6 grid gap-4">
            {[
              { icon: WifiOff, title: "Funciona offline", text: "O QR code abre mesmo sem internet na pista." },
              { icon: Send, title: "Transfira pra um amigo", text: "Passe o ingresso em segundos, com novo QR code." },
              { icon: RotateCcw, title: "Reembolso em até 7 dias", text: "Comprou e mudou de ideia? A gente resolve." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></span>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-extrabold uppercase text-primary">Sem dúvida no rolê</p>
        <h2 className="mb-5 text-3xl font-bold">Perguntas frequentes</h2>
        <Accordion type="single" collapsible>
          {buyerFaqs.map(([question, answer], index) => (
            <AccordionItem value={`faq-${index}`} key={question}>
              <AccordionTrigger className="text-base">{question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <ProducerCta />
    </>
  );
}

const eventsSearchState = { q: "", city: "", genres: [] as string[], prices: [] as string[], when: "" };
