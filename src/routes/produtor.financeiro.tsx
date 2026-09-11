import { createFileRoute } from "@tanstack/react-router";
import { Download, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { PanelCard, ProducerLayout, StatCard } from "@/components/producer/producer-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { balances, csvDownload, receivables, statement } from "@/data/producer";
import { brl, shortDate } from "@/lib/format";
import { producerActions, useProducer } from "@/lib/producer-store";

export const Route = createFileRoute("/produtor/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Painel Entrô" },
      {
        name: "description",
        content: "Saldo, adiantamento do Pix, antecipação do cartão, saques e extrato.",
      },
      { property: "og:title", content: "Financeiro — Painel Entrô" },
      {
        property: "og:description",
        content: "Acompanhe recebimentos e movimente o dinheiro das suas vendas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProducerFinance,
});

const HintCard = ({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "primary" | "sun";
}) => (
  <div className="relative">
    <StatCard label={label} value={value} hint={hint} {...(tone ? { tone } : {})} />
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="absolute right-3 top-3" aria-label={`Sobre ${label}`}>
          <Info className="size-4 opacity-60" />
        </TooltipTrigger>
        <TooltipContent className="max-w-56">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

function ProducerFinance() {
  const { events, availableBalance, profile, advanceLimit, withdrawBlocked, withdrawBlockReason } =
    useProducer();
  const upcoming = events.filter((e) => e.status !== "Cancelado");
  const [advance, setAdvance] = useState("2000");
  const [advanceEvent, setAdvanceEvent] = useState(upcoming[0]?.id ?? "");
  const [selectedReceivables, setSelectedReceivables] = useState<string[]>([]);
  const [withdrawValue, setWithdrawValue] = useState("1000");
  const [withdrawTarget, setWithdrawTarget] = useState<"pix" | "ted">("pix");
  const [feedback, setFeedback] = useState("");
  const [period, setPeriod] = useState("30");
  const [eventFilter, setEventFilter] = useState("todos");

  const advanceValue = Math.min(Number(advance || 0), advanceLimit);
  const advanceNet = advanceValue * (1 - 0.0299);

  const anticipationCost = useMemo(
    () =>
      receivables
        .filter((r) => selectedReceivables.includes(r.id))
        .reduce((sum, r) => {
          const days = Math.max(1, Math.round((+new Date(r.dueAt) - Date.now()) / 86400000));
          const monthly = r.installment === "À vista" ? 0.0125 : 0.017;
          return sum + r.amount * ((monthly * days) / 30 + 0.01);
        }, 0),
    [selectedReceivables],
  );
  const anticipationGross = receivables
    .filter((r) => selectedReceivables.includes(r.id))
    .reduce((s, r) => s + r.amount, 0);

  const pixDailyLimit = profile.personType === "juridica" ? 20000 : 5000;
  const withdrawNumber = Number(withdrawValue || 0);
  const overLimit = withdrawTarget === "pix" && withdrawNumber > pixDailyLimit;

  const rows = statement.filter((entry) => {
    const withinPeriod = +new Date(entry.date) >= Date.now() - Number(period) * 86400000;
    const matchesEvent = eventFilter === "todos" || entry.eventId === eventFilter;
    return withinPeriod && matchesEvent;
  });

  const schedule = [...receivables].sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));

  return (
    <ProducerLayout
      title="Financeiro"
      description="Como e quando o dinheiro das suas vendas chega até você."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HintCard
          label="Saldo disponível"
          value={brl(availableBalance)}
          hint="Pronto para sacar."
          tone="primary"
        />
        <HintCard
          label="A liberar"
          value={brl(balances.pending)}
          hint="Vendas no Pix, liberadas 48h úteis após o evento."
        />
        <HintCard
          label="Cartão a receber"
          value={brl(balances.cardToReceive)}
          hint="Vendas no cartão, que caem 32 dias após cada compra."
        />
        <HintCard
          label="Retido para chargeback"
          value={brl(balances.chargebackHold)}
          hint="10% das vendas no cartão, liberado 30 dias após o evento."
          tone="sun"
        />
      </div>

      {feedback ? (
        <p className="mt-4 rounded-xl bg-sun px-4 py-3 text-sm font-bold text-ink">{feedback}</p>
      ) : null}

      <Tabs defaultValue="adiantamento" className="mt-5">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="adiantamento">Adiantamento do Pix</TabsTrigger>
          <TabsTrigger value="antecipacao">Antecipação do cartão</TabsTrigger>
          <TabsTrigger value="sacar">Sacar</TabsTrigger>
          <TabsTrigger value="extrato">Extrato</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="adiantamento" className="mt-4">
          <PanelCard title="Adiantamento do Pix">
            <p className="text-sm text-muted-foreground">
              Disponível para adiantar:{" "}
              <strong className="text-foreground">{brl(advanceLimit)}</strong> — até 50% das vendas
              no Pix feitas há mais de 7 dias, em eventos que ainda não aconteceram.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Evento</Label>
                <Select value={advanceEvent} onValueChange={setAdvanceEvent}>
                  <SelectTrigger className="mt-1" aria-label="Evento do adiantamento">
                    <SelectValue placeholder="Escolha o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {upcoming.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor a adiantar</Label>
                <Input
                  inputMode="numeric"
                  value={advance}
                  onChange={(e) => setAdvance(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="rounded-xl bg-muted p-3 text-sm sm:col-span-2">
                <p>Taxa de 2,99%: {brl(advanceValue * 0.0299)}</p>
                <p className="font-bold">Você recebe {brl(advanceNet)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Se o evento for cancelado, os reembolsos serão descontados do seu saldo.
            </p>
            <p className="mt-1 rounded-xl bg-sun p-3 text-sm font-bold text-ink">
              Atenção: depois de receber o dinheiro antes do evento, esse evento não pode mais ser
              cancelado.
            </p>
            <Button
              className="mt-4"
              disabled={!advanceEvent || advanceValue <= 0}
              onClick={() => {
                producerActions.changeBalance(advanceNet);
                producerActions.registerAdvance(advanceEvent, advanceValue, "Adiantamento");
                const name = events.find((e) => e.id === advanceEvent)?.name ?? "evento";
                setFeedback(
                  `Adiantamento simulado de ${brl(advanceNet)} creditado no saldo. O evento ${name} não pode mais ser cancelado.`,
                );
              }}
            >
              Confirmar adiantamento
            </Button>
          </PanelCard>
        </TabsContent>

        <TabsContent value="antecipacao" className="mt-4">
          <PanelCard title="Antecipação do cartão">
            <div className="space-y-2">
              {receivables.map((r) => (
                <label
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm"
                >
                  <Checkbox
                    checked={selectedReceivables.includes(r.id)}
                    onCheckedChange={(checked) =>
                      setSelectedReceivables((current) =>
                        checked ? [...current, r.id] : current.filter((id) => id !== r.id),
                      )
                    }
                  />
                  <span className="font-bold">{brl(r.amount)}</span>
                  <span className="text-muted-foreground">{r.installment}</span>
                  <span className="ml-auto text-muted-foreground">
                    Previsto para {shortDate(r.dueAt)}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
              <p>
                Selecionado: <strong>{brl(anticipationGross)}</strong>
              </p>
              <p>
                Custo estimado: <strong>{brl(anticipationCost)}</strong> (1,25% ao mês à vista ou
                1,70% parcelado, proporcional aos dias, mais 1% da Entrô)
              </p>
              <p className="font-bold">
                Você recebe {brl(Math.max(0, anticipationGross - anticipationCost))}
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sujeito a análise de crédito. Se o evento for cancelado, os reembolsos serão
              descontados do seu saldo.
            </p>
            <p className="mt-1 rounded-xl bg-sun p-3 text-sm font-bold text-ink">
              Atenção: eventos com dinheiro recebido antes da data não podem mais ser cancelados.
            </p>
            <Button
              className="mt-4"
              disabled={selectedReceivables.length === 0}
              onClick={() => {
                producerActions.changeBalance(anticipationGross - anticipationCost);
                receivables
                  .filter((r) => selectedReceivables.includes(r.id))
                  .forEach((r) =>
                    producerActions.registerAdvance(r.eventId, r.amount, "Antecipação"),
                  );
                setFeedback(
                  "Antecipação aprovada na simulação e creditada no saldo. Os eventos envolvidos não podem mais ser cancelados.",
                );
                setSelectedReceivables([]);
              }}
            >
              Antecipar selecionados
            </Button>
          </PanelCard>
        </TabsContent>

        <TabsContent value="sacar" className="mt-4">
          <PanelCard title="Sacar">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Valor</Label>
                <Input
                  inputMode="numeric"
                  value={withdrawValue}
                  onChange={(e) => setWithdrawValue(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div>
                <Label>Destino</Label>
                <RadioGroup
                  value={withdrawTarget}
                  onValueChange={(value) => setWithdrawTarget(value as "pix" | "ted")}
                  className="mt-2 gap-2"
                >
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <RadioGroupItem value="pix" /> Chave Pix {profile.pixKey}
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <RadioGroupItem value="ted" /> TED para conta do mesmo titular
                  </label>
                </RadioGroup>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              30 saques via Pix grátis por mês. Depois, R$ 2,00 cada. TED: R$ 5,00.
            </p>
            <p className="text-xs text-muted-foreground">
              Limite diário via Pix: R$ 5.000 para pessoa física e R$ 20.000 para pessoa jurídica.
            </p>
            {overLimit ? (
              <p className="mt-3 rounded-xl bg-sun p-3 text-sm font-bold text-ink">
                Esse valor passa do limite diário via Pix ({brl(pixDailyLimit)}). Use TED para sacar
                tudo de uma vez.
              </p>
            ) : null}
            {withdrawBlocked ? (
              <p className="mt-3 rounded-xl border-2 border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive">
                Saques temporariamente travados pela Entrô
                {withdrawBlockReason ? `: ${withdrawBlockReason}` : "."} Fale com o suporte.
              </p>
            ) : null}
            <Button
              className="mt-4"
              disabled={
                withdrawBlocked ||
                withdrawNumber <= 0 ||
                withdrawNumber > availableBalance ||
                overLimit
              }
              onClick={() => {
                const cost = withdrawTarget === "ted" ? 5 : 0;
                producerActions.changeBalance(-(withdrawNumber + cost));
                setFeedback(`Saque simulado de ${brl(withdrawNumber)} solicitado.`);
              }}
            >
              Sacar agora
            </Button>
          </PanelCard>
        </TabsContent>

        <TabsContent value="extrato" className="mt-4">
          <PanelCard
            title="Extrato"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  csvDownload("extrato-entro.csv", [
                    ["Data", "Tipo", "Descrição", "Valor"],
                    ...rows.map((r) => [shortDate(r.date), r.kind, r.description, r.amount]),
                  ])
                }
              >
                <Download className="size-4" /> Exportar CSV
              </Button>
            }
          >
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="w-40">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger aria-label="Período">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-56">
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger aria-label="Evento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os eventos</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{row.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {shortDate(row.date)} · {row.kind}
                    </p>
                  </div>
                  <span
                    className={
                      row.amount < 0 ? "font-bold text-destructive" : "font-bold text-emerald-700"
                    }
                  >
                    {brl(row.amount)}
                  </span>
                </div>
              ))}
              {rows.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Nada nesse período.</p>
              ) : null}
            </div>
          </PanelCard>
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <PanelCard title="Agenda de recebimentos">
            <div className="divide-y divide-border">
              {schedule.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-semibold">{shortDate(r.dueAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {events.find((e) => e.id === r.eventId)?.name} · {r.installment}
                    </p>
                  </div>
                  <span className="font-bold">{brl(r.amount)}</span>
                </div>
              ))}
            </div>
          </PanelCard>
        </TabsContent>
      </Tabs>
    </ProducerLayout>
  );
}
