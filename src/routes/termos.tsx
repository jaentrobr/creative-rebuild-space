import { createFileRoute } from "@tanstack/react-router";
import { ProducerCta } from "@/components/producer-cta";
import { PageShell } from "@/components/page-shell";
import { LegalPage } from "@/components/legal-page";
import { termsSections } from "@/data/legal";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — Entrô" },
      { name: "description", content: "Termos de uso da plataforma Entrô." },
      { property: "og:title", content: "Termos de uso — Entrô" },
      { property: "og:description", content: "Regras para uso da Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <>
      <PageShell className="max-w-3xl">
        <LegalPage title="Termos de uso" sections={termsSections} />
      </PageShell>
      <ProducerCta />
    </>
  );
}
