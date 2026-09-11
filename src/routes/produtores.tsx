import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, QrCode, Rocket, WalletCards } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ProducerCta } from "@/components/producer-cta";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/produtores")({
  head: () => ({
    meta: [
      { title: "Venda ingressos com taxa justa — Entrô" },
      { name: "description", content: "Crie seu evento, acompanhe divulgadores e receba com rapidez pela Entrô." },
      { property: "og:title", content: "Para produtores — Entrô" },
      { property: "og:description", content: "Sua festa merece taxa justa e suporte de verdade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProducersPage,
});

const benefits = [
  [WalletCards, "Taxa a partir de 7%", "Paga pelo comprador, sem surpresa para sua produção."],
  [QrCode, "Check-in offline", "Leitura rápida mesmo quando a internet não colabora."],
  [BarChart3, "Links de divulgador", "Acompanhe o resultado de cada parceria."],
  [Rocket, "Adiantamento", "Até 50% das vendas no Pix para fazer acontecer."],
] as const;

function ProducersPage() {
  const { signedIn } = useSession();

  return (
    <>
      <section className="wave-field py-16 sm:py-24">
        <PageShell className="py-0 sm:py-0">
          <p className="text-sm font-extrabold uppercase text-primary">Entrô para produtores</p>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-none sm:text-7xl">Sua festa merece taxa justa.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">Tecnologia simples, repasse ágil e gente de verdade cuidando do seu evento.</p>
          {signedIn ? (
            <Button asChild size="lg" className="mt-7">
              <Link to="/produtor">Criar meu evento</Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="mt-7">
              <Link to="/entrar" search={{ redirect: "/produtor" } as unknown as never}>Criar meu evento</Link>
            </Button>
          )}
        </PageShell>
      </section>
      <PageShell>
        <h2 className="text-3xl font-bold">Como funciona</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {["Crie o evento", "Divulgue com links próprios", "Receba em 48h úteis"].map((step, index) => (
            <div className="border-t-4 border-primary py-5" key={step}>
              <span className="font-display text-4xl font-bold text-cta">0{index + 1}</span>
              <h3 className="mt-2 text-xl font-bold">{step}</h3>
            </div>
          ))}
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(([Icon, title, text]) => {
            const BenefitIcon = Icon;
            return (
              <div key={String(title)} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <BenefitIcon className="size-8 text-primary" />
                <h3 className="mt-4 text-xl font-bold">{String(title)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{String(text)}</p>
              </div>
            );
          })}
        </div>
      </PageShell>
      <ProducerCta />
    </>
  );
}
