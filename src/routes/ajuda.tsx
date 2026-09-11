import { createFileRoute } from "@tanstack/react-router";
import { ProducerCta } from "@/components/producer-cta";
import { useState } from "react";
import { Search } from "lucide-react";
import { buyerFaqs, producerFaqs } from "@/data/faqs";
import { PageShell } from "@/components/page-shell";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Central de ajuda — Entrô" },
      { name: "description", content: "Respostas para compradores e produtores da Entrô." },
      { property: "og:title", content: "Ajuda — Entrô" },
      { property: "og:description", content: "Tire suas dúvidas sobre ingressos e eventos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});
function HelpPage() {
  const [query, setQuery] = useState("");
  const sections = [
    ["Para compradores", buyerFaqs],
    ["Para produtores", producerFaqs],
  ] as const;
  return (
    <>
      <PageShell className="max-w-4xl">
        <p className="text-sm font-extrabold uppercase text-primary">Pode perguntar</p>
        <h1 className="text-5xl font-bold">Como podemos ajudar?</h1>
        <label className="relative mt-7 block">
          <Search className="absolute left-4 top-3.5 size-5 text-primary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque uma dúvida"
            className="h-12 pl-12"
          />
        </label>
        {sections.map(([title, faqs]) => {
          const filtered = faqs.filter(([q, a]) =>
            `${q} ${a}`.toLowerCase().includes(query.toLowerCase()),
          );
          return (
            <section key={title} className="mt-10">
              <h2 className="text-3xl font-bold">{title}</h2>
              <Accordion type="single" collapsible>
                {filtered.map(([q, a], i) => (
                  <AccordionItem value={`${title}-${i}`} key={q}>
                    <AccordionTrigger className="text-base">{q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {!filtered.length && (
                <p className="py-5 text-muted-foreground">Nenhuma resposta encontrada aqui.</p>
              )}
            </section>
          );
        })}
      </PageShell>
      <ProducerCta />
    </>
  );
}
