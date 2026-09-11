import { createFileRoute } from "@tanstack/react-router";
import { ProducerCta } from "@/components/producer-cta";
import { PageShell } from "@/components/page-shell";
import { LegalPage } from "@/components/legal-page";
import { privacySections } from "@/data/legal";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — Entrô" },
      { name: "description", content: "Política de privacidade da plataforma Entrô." },
      { property: "og:title", content: "Privacidade — Entrô" },
      { property: "og:description", content: "Como a Entrô cuida dos seus dados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <>
      <PageShell className="max-w-3xl">
        <LegalPage title="Política de privacidade" sections={privacySections} />
      </PageShell>
      <ProducerCta />
    </>
  );
}
