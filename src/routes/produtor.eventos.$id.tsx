import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Copy, Download, PauseCircle, RefreshCw, Share2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { RescheduleDialog } from "@/components/producer/reschedule-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/integrations/meu-supabase/client";
import { useAuth } from "@/lib/auth";
import { useEvent, useEventTicketTypes } from "@/lib/producer-queries";
import { rescheduleDeadline, translateRescheduleError } from "@/lib/reschedule";
import { PanelCard, ProducerLayout, StatCard, StatusPill } from "@/components/producer/producer-layout";
import { SalesChart } from "@/components/producer/sales-chart";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  csvDownload,
  eventCapacity,
  eventParticipants,
  eventRevenue,
  eventSold,
  initialTicketTypes,
  maskCpfPartial,
  promoterDailySales,
  randomPassword,
  randomPromoCode,
  salesByDay,
  statement,
  type Coupon,
  type Courtesy,
  type GateUser,
  type Promoter,
} from "@/data/producer";
import { brl, maskPhone, shortDate, shortDateTime } from "@/lib/format";
import { producerActions, useProducer } from "@/lib/producer-store";

export const Route = createFileRoute("/produtor/eventos/$id")({
  loader: ({ params }) => {
    if (!params.id) throw notFound();
    return params.id;
  },
  head: () => ({
    meta: [
      { title: "Gerenciar evento — Painel Entrô" },
      { name: "description", content: "Vendas, participantes, cortesias, cupons, divulgadores e portaria do seu evento." },
      { property: "og:title", content: "Gerenciar evento — Painel Entrô" },
      { property: "og:description", content: "Tudo o que acontece no seu evento em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageEvent,
});

function ManageEvent() {
  const { id } = Route.useParams();
  const store = useProducer();
  const event = store.events.find((item) => item.id === id);
  const { producer } = useAuth();
  const { data: realEvent } = useEvent(id);
  const { data: ticketTypesReal } = useEventTicketTypes(id);
  const lotsReal = useMemo(() => (ticketTypesReal ?? []).flatMap((t) => t.lots ?? []), [ticketTypesReal]);
  const soldCount = useMemo(() => lotsReal.reduce((s, l) => s + (l.sold_count ?? 0), 0), [lotsReal]);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const { data: rescheduleSummaryRaw } = useQuery({
    queryKey: ["reschedule-summary", id],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_reschedule_summary", { p_event_id: id as string });
      if (error) throw error;
      return data as unknown as { keep_count: number; refund_count: number; pending_count: number };
    },
    enabled: !!id && (realEvent?.reschedule_count ?? 0) >= 1,
  });

  if (!event) {
    return (
      <ProducerLayout title="Evento não encontrado">
        <Button asChild><Link to="/produtor/eventos">Voltar para meus eventos</Link></Button>
      </ProducerLayout>
    );
  }

  const people = store.participants.filter((p) => p.eventId === event.id);
  const sold = eventSold(event.id);
  const capacity = eventCapacity(event.id) || 1;
  const types = initialTicketTypes[event.id] ?? [];
  const advanced = store.advancedEvents[event.id] ?? null;

  const canReschedule = !!realEvent && !["ended", "canceled", "suspended"].includes(realEvent.status);
  const alreadyRescheduled = (realEvent?.reschedule_count ?? 0) >= 1;
  const deadline = realEvent ? rescheduleDeadline(realEvent) : null;

  return (
    <ProducerLayout
      title={event.name}
      description={`${shortDateTime(event.startAt)} · ${event.venue || "local a definir"}`}
      actions={
        <>
          <StatusPill status={event.salesPaused ? "Vendas pausadas" : event.status} />
          <Button variant="outline" size="sm" asChild><Link to="/produtor/eventos">Voltar</Link></Button>
        </>
      }
    >
      <Tabs defaultValue="visao">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex h-auto w-max flex-nowrap gap-1 p-1 lg:w-full">
            {[
              ["visao", "Visão geral"],
              ["participantes", "Participantes"],
              ["cortesias", "Cortesias"],
              ["cupons", "Cupons"],
              ["divulgadores", "Divulgadores"],
              ["portaria", "Portaria"],
              ["financeiro", "Financeiro"],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value!} className="shrink-0 whitespace-nowrap px-3 py-2 text-sm lg:flex-1">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="visao" className="mt-4 space-y-4">
          <Overview eventId={event.id} sold={sold} capacity={capacity} people={people} types={types} />
          <PanelCard title="Controles do evento">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => producerActions.updateEvent(event.id, { salesPaused: !event.salesPaused })}>
                <PauseCircle className="size-4" /> {event.salesPaused ? "Retomar vendas" : "Pausar vendas"}
              </Button>
              {advanced ? (
                <Button variant="outline" disabled><XCircle className="size-4" /> Cancelar evento</Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline"><XCircle className="size-4" /> Cancelar evento</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar {event.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todo o dinheiro deste evento é congelado na hora e estornado integralmente para quem comprou. O evento sai do ar e essa ação não tem volta.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => producerActions.cancelEvent(event.id)}>Cancelar evento</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {canReschedule ? (
                alreadyRescheduled ? (
                  <Button variant="outline" disabled title={`Data já alterada em ${realEvent?.rescheduled_at ? shortDateTime(realEvent.rescheduled_at) : ""}`}>
                    <CalendarClock className="size-4" /> Data já alterada
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
                    <CalendarClock className="size-4" /> Alterar data
                  </Button>
                )
              ) : null}
            </div>
            {canReschedule && alreadyRescheduled && realEvent?.rescheduled_at ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Data já alterada em {shortDateTime(realEvent.rescheduled_at)}. Se o evento não puder acontecer na nova data, será necessário cancelar.
              </p>
            ) : null}
            {canReschedule && !alreadyRescheduled ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {soldCount > 0
                  ? `Com vendas confirmadas (${soldCount} ingressos), a data só pode ser alterada 1 vez, até ${deadline ? shortDateTime(deadline.toISOString()) : "—"}.`
                  : "Sem ingressos vendidos: você pode alterar a data livremente."}
              </p>
            ) : null}
            {advanced ? (
              <p className="mt-3 rounded-xl bg-sun p-3 text-sm font-bold text-ink">
                Você já recebeu {brl(advanced.amount)} deste evento de forma antecipada ({advanced.kind.toLowerCase()} em {shortDate(advanced.at)}).
                Por isso o cancelamento não está mais disponível. Fale com a Entrô pelo suporte se precisar resolver algo.
              </p>
            ) : null}
          </PanelCard>
          {realEvent ? (
            <RescheduleDialog
              open={rescheduleOpen}
              onOpenChange={setRescheduleOpen}
              event={realEvent}
              lots={lotsReal}
              producerId={producer?.id}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="participantes" className="mt-4"><Participants eventId={event.id} eventName={event.name} types={types} /></TabsContent>
        <TabsContent value="cortesias" className="mt-4"><Courtesies eventId={event.id} limit={event.settings.courtesyLimit} types={types} /></TabsContent>
        <TabsContent value="cupons" className="mt-4"><Coupons eventId={event.id} types={types} /></TabsContent>
        <TabsContent value="divulgadores" className="mt-4"><Promoters eventId={event.id} slug={event.slug} /></TabsContent>
        <TabsContent value="portaria" className="mt-4"><GateTeam eventId={event.id} /></TabsContent>
        <TabsContent value="financeiro" className="mt-4"><EventFinance eventId={event.id} /></TabsContent>
      </Tabs>
    </ProducerLayout>
  );
}

type TypeList = { id: string; name: string; lots: { id: string; name: string; price: number; quantity: number; sold: number }[] }[];

function Overview({ eventId, sold, capacity, people, types }: { eventId: string; sold: number; capacity: number; people: ReturnType<typeof eventParticipants>; types: TypeList }) {
  const chart = useMemo(() => salesByDay.filter((p) => p.eventId === eventId).map((p) => ({ label: p.label, value: p.value })), [eventId]);
  const pix = people.filter((p) => p.payment === "Pix").length;
  const card = people.length - pix;
  const checkins = people.filter((p) => p.checkedIn).length;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingressos vendidos" value={`${sold}/${capacity}`} tone="primary" />
        <StatCard label="Receita" value={brl(eventRevenue(eventId))} />
        <StatCard label="Pix / Cartão" value={`${pix} / ${card}`} hint="Vendas por forma de pagamento" />
        <StatCard label="Check-ins" value={`${checkins}/${people.length}`} tone="sun" />
      </div>
      <PanelCard title="Vendas por dia"><SalesChart data={chart} /></PanelCard>
      <PanelCard title="Vendidos por tipo e lote">
        <div className="space-y-4">
          {types.map((type) => (
            <div key={type.id}>
              <p className="font-display text-base font-extrabold">{type.name}</p>
              {type.lots.map((l) => (
                <div key={l.id} className="mt-2">
                  <div className="flex justify-between text-sm"><span>{l.name} · {brl(l.price)}</span><span className="font-semibold">{l.sold}/{l.quantity}</span></div>
                  <Progress value={(l.sold / (l.quantity || 1)) * 100} className="mt-1" />
                </div>
              ))}
            </div>
          ))}
          {types.length === 0 ? <p className="text-sm text-muted-foreground">Este evento ainda não tem ingressos configurados.</p> : null}
        </div>
      </PanelCard>
    </>
  );
}

function Participants({ eventId, eventName, types }: { eventId: string; eventName: string; types: TypeList }) {
  const store = useProducer();
  const all = store.participants.filter((p) => p.eventId === eventId);
  const [term, setTerm] = useState("");
  const [type, setType] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [half, setHalf] = useState("todos");
  const [checkin, setCheckin] = useState("todos");

  const list = all.filter((p) => {
    const text = `${p.name} ${p.cpf} ${p.email}`.toLowerCase();
    return (
      (!term || text.includes(term.toLowerCase())) &&
      (type === "todos" || p.type === type) &&
      (status === "todos" || p.status === status) &&
      (half === "todos" || (half === "sim") === p.half) &&
      (checkin === "todos" || (checkin === "feito") === p.checkedIn)
    );
  });

  return (
    <PanelCard
      title={`Participantes (${list.length})`}
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            csvDownload(`participantes-${eventName}.csv`, [
              ["Nome", "E-mail", "CPF", "Tipo", "Lote", "Meia", "Pagamento", "Status", "Check-in", "Código"],
              ...list.map((p) => [p.name, p.email, maskCpfPartial(p.cpf), p.type, p.lot, p.half ? "Sim" : "Não", p.payment, p.status, p.checkedIn ? "Feito" : "Pendente", p.code]),
            ])
          }
        >
          <Download className="size-4" /> Exportar CSV
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input placeholder="Buscar por nome, CPF ou e-mail" value={term} onChange={(e) => setTerm(e.target.value)} className="lg:col-span-2" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {types.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["todos", "Válido", "Utilizado", "Transferido", "Reembolsado"].map((s) => <SelectItem key={s} value={s}>{s === "todos" ? "Todos os status" : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={checkin} onValueChange={setCheckin}>
          <SelectTrigger aria-label="Check-in"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Check-in: todos</SelectItem>
            <SelectItem value="feito">Check-in feito</SelectItem>
            <SelectItem value="pendente">Check-in pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={half} onValueChange={setHalf}>
          <SelectTrigger aria-label="Meia-entrada"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Meia: todos</SelectItem>
            <SelectItem value="sim">Só meia-entrada</SelectItem>
            <SelectItem value="nao">Só inteira</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>{["Nome", "CPF", "Tipo / lote", "Pagamento", "Status", "Check-in"].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.slice(0, 60).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2 pr-3">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </td>
                <td className="py-2 pr-3">{maskCpfPartial(p.cpf)}</td>
                <td className="py-2 pr-3">{p.type} · {p.lot}{p.half ? " · meia" : ""}</td>
                <td className="py-2 pr-3">{p.payment}{p.installments > 1 ? ` ${p.installments}x` : ""}</td>
                <td className="py-2 pr-3"><StatusPill status={p.status} /></td>
                <td className="py-2 pr-3">{p.checkedIn ? "Feito" : "Pendente"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length > 60 ? <p className="mt-3 text-xs text-muted-foreground">Mostrando 60 de {list.length}. Use os filtros ou exporte o CSV.</p> : null}
      </div>
    </PanelCard>
  );
}

function Courtesies({ eventId, limit, types }: { eventId: string; limit: number; types: TypeList }) {
  const { courtesies } = useProducer();
  const list = courtesies.filter((c) => c.eventId === eventId);
  const used = list.reduce((s, c) => s + c.quantity, 0);
  const [form, setForm] = useState({ name: "", email: "", type: types[0]?.name ?? "Pista", quantity: "1" });

  return (
    <div className="space-y-4">
      <PanelCard title="Emitir cortesia">
        <div className="grid gap-3 sm:grid-cols-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>E-mail</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <Label>Tipo de ingresso</Label>
            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantidade</Label><Input inputMode="numeric" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value.replace(/\D/g, "") })} /></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Limite de cortesias deste evento: {used} de {limit} usadas.</p>
        <Button
          className="mt-3"
          disabled={!form.name || used + Number(form.quantity || 0) > limit}
          onClick={() => {
            const courtesy: Courtesy = { id: `ct-${Date.now()}`, eventId, name: form.name, email: form.email, type: form.type, quantity: Number(form.quantity || 1), status: "Enviada" };
            producerActions.addCourtesy(courtesy);
            setForm({ ...form, name: "", email: "", quantity: "1" });
          }}
        >
          Emitir cortesia
        </Button>
      </PanelCard>

      <PanelCard title="Cortesias emitidas">
        <div className="divide-y divide-border">
          {list.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{c.name} · {c.quantity}x {c.type}</p>
                <p className="text-xs text-muted-foreground">{c.email}</p>
              </div>
              <StatusPill status={c.status} />
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => producerActions.updateCourtesy(c.id, { status: "Enviada" })}>Reenviar</Button>
                <Button size="sm" variant="ghost" onClick={() => producerActions.updateCourtesy(c.id, { status: "Cancelada" })}>Cancelar</Button>
              </div>
            </div>
          ))}
          {list.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhuma cortesia emitida.</p> : null}
        </div>
      </PanelCard>
    </div>
  );
}

function Coupons({ eventId, types }: { eventId: string; types: TypeList }) {
  const { coupons } = useProducer();
  const list = coupons.filter((c) => c.eventId === eventId);
  const [form, setForm] = useState({ code: "", kind: "percent" as Coupon["kind"], amount: "10", limit: "100", validUntil: "" });

  return (
    <div className="space-y-4">
      <PanelCard title="Criar cupom">
        <div className="grid gap-3 sm:grid-cols-5">
          <div><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
          <div>
            <Label>Desconto</Label>
            <Select value={form.kind} onValueChange={(value) => setForm({ ...form, kind: value as Coupon["kind"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="percent">Em %</SelectItem><SelectItem value="value">Em R$</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Valor</Label><Input inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })} /></div>
          <div><Label>Limite de usos</Label><Input inputMode="numeric" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value.replace(/\D/g, "") })} /></div>
          <div><Label>Validade</Label><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Vale para: {types.map((t) => t.name).join(", ") || "todos os tipos"}</p>
        <Button
          className="mt-3"
          disabled={!form.code}
          onClick={() => {
            producerActions.addCoupon({
              id: `cp-${Date.now()}`,
              eventId,
              code: form.code,
              kind: form.kind,
              amount: Number(form.amount || 0),
              limit: Number(form.limit || 0),
              used: 0,
              validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : new Date().toISOString(),
              types: types.map((t) => t.name),
              active: true,
            });
            setForm({ ...form, code: "" });
          }}
        >
          Criar cupom
        </Button>
      </PanelCard>

      <PanelCard title="Cupons do evento">
        <div className="divide-y divide-border">
          {list.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div>
                <p className="font-display text-base font-extrabold">{c.code}</p>
                <p className="text-xs text-muted-foreground">
                  {c.kind === "percent" ? `${c.amount}% de desconto` : `${brl(c.amount)} de desconto`} · {c.used}/{c.limit} usos · até {shortDate(c.validUntil)}
                </p>
              </div>
              <StatusPill status={c.active ? "Ativo" : "Pausado"} />
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => producerActions.toggleCoupon(c.id)}>{c.active ? "Desativar" : "Ativar"}</Button>
            </div>
          ))}
          {list.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum cupom criado.</p> : null}
        </div>
      </PanelCard>
    </div>
  );
}

function Promoters({ eventId, slug }: { eventId: string; slug: string }) {
  const { promoters } = useProducer();
  const list = promoters.filter((p) => p.eventId === eventId).sort((a, b) => b.sold - a.sold);
  const [form, setForm] = useState({ name: "", whatsapp: "", code: "", kind: "percent" as Promoter["commissionKind"], commission: "10" });
  const [detail, setDetail] = useState<string | null>(null);
  const link = (code: string) => `https://jaentro.com.br/evento/${slug}?ref=${code}`;
  const commissionDue = (p: Promoter) => (p.commissionKind === "percent" ? (p.revenue * p.commission) / 100 : p.commissionKind === "fixed" ? p.sold * p.commission : 0);
  const selected = list.find((p) => p.id === detail);

  return (
    <div className="space-y-4">
      <PanelCard title="Novo divulgador">
        <div className="grid gap-3 sm:grid-cols-5">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, code: form.code || randomPromoCode(e.target.value) })} /></div>
          <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} /></div>
          <div><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
          <div>
            <Label>Comissão</Label>
            <Select value={form.kind} onValueChange={(value) => setForm({ ...form, kind: value as Promoter["commissionKind"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem comissão</SelectItem>
                <SelectItem value="percent">% por ingresso</SelectItem>
                <SelectItem value="fixed">R$ fixo por ingresso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Valor</Label><Input inputMode="numeric" disabled={form.kind === "none"} value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value.replace(/\D/g, "") })} /></div>
        </div>
        <Button
          className="mt-3"
          disabled={!form.name}
          onClick={() => {
            producerActions.addPromoter({
              id: `pm-${Date.now()}`,
              eventId,
              name: form.name,
              whatsapp: form.whatsapp,
              code: form.code || randomPromoCode(form.name),
              commissionKind: form.kind,
              commission: Number(form.commission || 0),
              clicks: 0,
              sold: 0,
              revenue: 0,
              paid: false,
            });
            setForm({ name: "", whatsapp: "", code: "", kind: "percent", commission: "10" });
          }}
        >
          Criar divulgador
        </Button>
      </PanelCard>

      <PanelCard title="Ranking de divulgadores">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>{["Divulgador", "Cliques", "Vendidos", "Receita", "Comissão", "Ações"].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="py-3 pr-3">
                    <button className="font-semibold underline" onClick={() => setDetail(p.id)}>{p.name}</button>
                    <p className="text-xs text-muted-foreground">{p.code} · {p.whatsapp}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{link(p.code)}</p>
                    <div className="mt-1 flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard?.writeText(link(p.code))}><Copy className="size-4" /> Copiar link</Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`https://wa.me/?text=${encodeURIComponent(link(p.code))}`} target="_blank" rel="noreferrer"><Share2 className="size-4" /> WhatsApp</a>
                      </Button>
                    </div>
                  </td>
                  <td className="py-3 pr-3">{p.clicks}</td>
                  <td className="py-3 pr-3">{p.sold}</td>
                  <td className="py-3 pr-3">{brl(p.revenue)}</td>
                  <td className="py-3 pr-3">{brl(commissionDue(p))}</td>
                  <td className="py-3 pr-3">
                    {p.paid ? <StatusPill status="Comissão paga" /> : <Button size="sm" variant="outline" onClick={() => producerActions.updatePromoter(p.id, { paid: true })}>Marcar como paga</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      {selected ? (
        <PanelCard title={`Vendas de ${selected.name}`} action={<Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Fechar</Button>}>
          <div className="divide-y divide-border">
            {promoterDailySales(selected).map((row) => (
              <div key={row.label} className="flex justify-between py-2 text-sm">
                <span>{row.label}</span>
                <span className="text-muted-foreground">{row.tickets} ingressos</span>
                <span className="font-semibold">{brl(row.value)}</span>
              </div>
            ))}
          </div>
        </PanelCard>
      ) : null}
    </div>
  );
}

function GateTeam({ eventId }: { eventId: string }) {
  const { gateUsers } = useProducer();
  const list = gateUsers.filter((g) => g.eventId === eventId);
  const [form, setForm] = useState({ name: "", username: "", password: randomPassword() });
  const [copied, setCopied] = useState("");

  const copyInstructions = (user: GateUser) => {
    void navigator.clipboard?.writeText(
      `Acesso da portaria — Entrô\nLink: https://jaentro.com.br/portaria\nUsuário: ${user.username}\nSenha: ${user.password}`,
    );
    setCopied(user.id);
  };

  return (
    <div className="space-y-4">
      <PanelCard title="Novo login de portaria">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Usuário</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div>
            <Label>Senha gerada</Label>
            <div className="flex gap-2">
              <Input readOnly value={form.password} />
              <Button size="icon" variant="outline" aria-label="Copiar senha" onClick={() => void navigator.clipboard?.writeText(form.password)}><Copy className="size-4" /></Button>
              <Button size="icon" variant="outline" aria-label="Gerar nova senha" onClick={() => setForm({ ...form, password: randomPassword() })}><RefreshCw className="size-4" /></Button>
            </div>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">Permissão restrita: apenas check-in deste evento. Não vê vendas nem valores.</p>
        <Button
          className="mt-3"
          disabled={!form.name || !form.username}
          onClick={() => {
            producerActions.addGateUser({ id: `gt-${Date.now()}`, eventId, name: form.name, username: form.username, password: form.password, active: true, checkins: 0 });
            setForm({ name: "", username: "", password: randomPassword() });
          }}
        >
          Criar login
        </Button>
      </PanelCard>

      <PanelCard title="Equipe de portaria">
        <div className="divide-y divide-border">
          {list.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.username} · {user.checkins} check-ins</p>
              </div>
              <StatusPill status={user.active ? "Ativo" : "Pausado"} />
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => producerActions.updateGateUser(user.id, { active: !user.active })}>{user.active ? "Desativar" : "Ativar"}</Button>
                <Button size="sm" variant="ghost" onClick={() => producerActions.updateGateUser(user.id, { password: randomPassword() })}>Redefinir senha</Button>
                <Button size="sm" variant="outline" onClick={() => copyInstructions(user)}>{copied === user.id ? "Copiado!" : "Copiar instruções de acesso"}</Button>
              </div>
            </div>
          ))}
          {list.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum login de portaria criado.</p> : null}
        </div>
      </PanelCard>
    </div>
  );
}

function EventFinance({ eventId }: { eventId: string }) {
  const rows = statement.filter((entry) => entry.eventId === eventId);
  const sales = rows.filter((r) => r.kind === "Venda").reduce((s, r) => s + r.amount, 0);
  const fees = rows.filter((r) => r.kind === "Taxa").reduce((s, r) => s + r.amount, 0);
  const refundsTotal = rows.filter((r) => r.kind === "Estorno").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Vendas do evento" value={brl(sales)} tone="primary" />
        <StatCard label="Taxas" value={brl(fees)} />
        <StatCard label="Estornos" value={brl(refundsTotal)} tone="sun" />
      </div>
      <PanelCard
        title="Extrato do evento"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => csvDownload(`financeiro-${eventId}.csv`, [["Data", "Tipo", "Descrição", "Valor"], ...rows.map((r) => [shortDate(r.date), r.kind, r.description, r.amount])])}
          >
            <Download className="size-4" /> Exportar CSV
          </Button>
        }
      >
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-semibold">{row.description}</p>
                <p className="text-xs text-muted-foreground">{shortDate(row.date)} · {row.kind}</p>
              </div>
              <span className={row.amount < 0 ? "font-bold text-destructive" : "font-bold text-emerald-700"}>{brl(row.amount)}</span>
            </div>
          ))}
        </div>
      </PanelCard>
      <p className="text-xs text-muted-foreground">
        Vendas no Pix liberam 48h úteis após o evento. Cartão cai 32 dias após cada compra, com 10% retido para chargeback até 30 dias depois do evento.
      </p>
    </div>
  );
}
