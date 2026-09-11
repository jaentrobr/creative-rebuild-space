import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Check, Copy, CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { events } from "@/data/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/page-shell";

const schema = z.object({
  event: z.string().optional().catch("aurora-eletronica"),
  total: z.coerce.number().optional().catch(70),
  half: z.coerce.boolean().optional().catch(false),
  ref: z.string().optional().catch(""),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (search) => schema.parse(search),
  head: () => ({
    meta: [
      { title: "Checkout — Entrô" },
      { name: "description", content: "Finalize seu ingresso com segurança na Entrô." },
      { property: "og:title", content: "Checkout — Entrô" },
      { property: "og:description", content: "Finalize seu ingresso na Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const search = Route.useSearch();
  const total = search.total ?? 70;
  const event = events.find((item) => item.slug === search.event) ?? events[0];
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [seconds, setSeconds] = useState(900);
  const [copied, setCopied] = useState(false);
  const fee = useMemo(() => Math.max(method === "pix" ? 3.5 : 3.99, total * (method === "pix" ? 0.07 : 0.08)), [method, total]);

  useEffect(() => {
    if (step !== 3 || method !== "pix") return;
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [step, method]);

  if (step === 4) {
    return (
      <PageShell className="max-w-2xl text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-10" />
        </div>
        <h1 className="mt-6 text-5xl font-extrabold">Entrô!</h1>
        <p className="mt-3 text-lg">Seus ingressos foram enviados para seu e-mail.</p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/meus-ingressos">Ver meus ingressos</Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-5xl">
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((value) => (
          <div key={value} className={`h-2 flex-1 rounded-full ${value <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm font-extrabold uppercase text-primary">Etapa {step} de 3</p>
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <h1 className="text-4xl font-bold">Quem vai curtir?</h1>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Input required placeholder="Nome completo" />
                <Input required placeholder="CPF" />
                <Input required type="email" placeholder="E-mail" />
                <Input required placeholder="Celular" />
                <Input required placeholder="Nome do titular do ingresso" className="sm:col-span-2" />
              </div>
              {search.half && <p className="mt-4 rounded-lg bg-sun/30 p-3 text-sm font-semibold">Apresente documento de meia-entrada na entrada.</p>}
              <Button className="mt-6" size="lg" type="submit">Continuar</Button>
            </form>
          )}
          {step === 2 && (
            <div>
              <h1 className="text-4xl font-bold">Como quer pagar?</h1>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button onClick={() => setMethod("pix")} className={`rounded-xl border-2 p-5 text-left ${method === "pix" ? "border-primary bg-secondary" : "border-border"}`}>
                  <QrCode className="mb-3 text-primary" />
                  <strong>Pix</strong>
                  <p className="text-sm text-muted-foreground">Aprovação rápida · taxa de 7%</p>
                </button>
                <button onClick={() => setMethod("card")} className={`rounded-xl border-2 p-5 text-left ${method === "card" ? "border-primary bg-secondary" : "border-border"}`}>
                  <CreditCard className="mb-3 text-primary" />
                  <strong>Cartão</strong>
                  <p className="text-sm text-muted-foreground">Até 6x · taxa de 8%</p>
                </button>
              </div>
              {method === "card" && (
                <label className="mt-4 block text-sm font-semibold">
                  Parcelas
                  <select className="mt-2 w-full rounded-lg border border-input bg-background p-3">
                    <option>1x sem juros</option>
                    <option>2x com juros · total R$ {(total + fee + 4.9).toFixed(2).replace(".", ",")}</option>
                    <option>6x com juros · total R$ {(total + fee + 18.5).toFixed(2).replace(".", ",")}</option>
                  </select>
                </label>
              )}
              <Button className="mt-6" size="lg" onClick={() => setStep(3)}>Continuar com {method === "pix" ? "Pix" : "cartão"}</Button>
            </div>
          )}
          {step === 3 && (
            <div>
              <h1 className="text-4xl font-bold">{method === "pix" ? "Pague com Pix" : "Dados do cartão"}</h1>
              {method === "pix" ? (
                <div className="mt-6">
                  <div className="grid size-48 place-items-center rounded-xl border-8 border-background bg-ink text-7xl text-primary-foreground shadow-sm">▦</div>
                  <p className="mt-4 font-bold">Expira em {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p>
                  <Button variant="outline" className="mt-3" onClick={() => { navigator.clipboard?.writeText("00020126580014BR.GOV.BCB.PIX0136ENTRO-DEMONSTRACAO"); setCopied(true); }}>
                    <Copy />{copied ? "Código copiado" : "Copiar código"}
                  </Button>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Número do cartão" className="sm:col-span-2" />
                  <Input placeholder="Validade" />
                  <Input placeholder="CVV" />
                  <Input placeholder="Nome impresso" className="sm:col-span-2" />
                </div>
              )}
              <Button className="mt-8" size="lg" onClick={() => setStep(4)}>Simular pagamento aprovado</Button>
            </div>
          )}
        </div>
        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="text-2xl font-bold">Resumo</h2>
          <p className="mt-4 font-bold">{event?.name}</p>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span>Ingressos</span><span>R$ {total.toFixed(2).replace(".", ",")}</span></div>
            <div className="flex justify-between"><span>Taxa {method === "pix" ? "Pix" : "cartão"}</span><span>R$ {fee.toFixed(2).replace(".", ",")}</span></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><span>Total</span><span>R$ {(total + fee).toFixed(2).replace(".", ",")}</span></div>
          </div>
          <p className="mt-5 flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" /> Pagamento simulado. Nenhuma cobrança real será feita.</p>
        </aside>
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">Você pode desistir em até 7 dias, desde que falte mais de 48h para o evento.</p>
    </PageShell>
  );
}
