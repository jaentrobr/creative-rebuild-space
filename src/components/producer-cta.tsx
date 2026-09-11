import { Link } from "@tanstack/react-router";
import { Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function ProducerCta() {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden bg-primary py-14 text-primary-foreground sm:py-20">
      <span className="absolute left-4 top-6 text-3xl text-sun sm:left-10 sm:top-10 sm:text-4xl">
        ✦
      </span>
      <span className="absolute right-6 top-10 text-2xl text-cta sm:right-16 sm:top-14 sm:text-3xl">
        ϟ
      </span>
      <span className="absolute bottom-8 left-8 text-2xl text-sun/60 sm:bottom-12 sm:left-20 sm:text-3xl">
        ✦
      </span>
      <Zap className="absolute right-10 bottom-10 size-10 text-cta sm:right-24 sm:bottom-14 sm:size-14" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-1.5 text-sm font-extrabold">
          <Sparkles className="size-4" /> Entrô para produtores
        </p>
        <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl">Quer criar seu evento?</h2>
        <p className="mx-auto mt-3 max-w-lg text-lg text-primary-foreground/85">
          Publique sua festa, venda ingressos e acompanhe tudo em um só lugar.
        </p>
        {user ? (
          <Button
            asChild
            size="lg"
            className="mt-7 border-2 border-ink bg-cta text-cta-foreground shadow-pop hover:-translate-y-0.5 hover:shadow-pop-lg active:translate-y-0 active:shadow-none"
          >
            <Link to="/produtor">Criar meu evento</Link>
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            className="mt-7 border-2 border-ink bg-cta text-cta-foreground shadow-pop hover:-translate-y-0.5 hover:shadow-pop-lg active:translate-y-0 active:shadow-none"
          >
            <Link to="/entrar" search={{ redirect: "/produtor" } as unknown as never}>
              Criar meu evento
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
