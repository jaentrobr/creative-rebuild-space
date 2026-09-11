import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminLayout, PanelCard, StatCard, StatusPill } from "@/components/admin/admin-layout";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cities, orders, producerEvents, refunds, chargebacks, type AdminProducer } from "@/data/admin";
import { brl, shortDate, shortDateTime } from "@/lib/format";
import { adminActions, defaultOverride, useAdmin } from "@/lib/admin-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtores")({
  head: () => ({ meta: [{ title: "Produtores — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminProducers,
});

function AdminProducers() {
  const { producers } = useAdmin();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("todas");
  const [verification, setVerification] = useState("todas");
  const [selected, setSelected] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const filtered = useMemo(
    () =>
      producers.filter(
        (p) =>
          (search.trim() === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()) || p.document.includes(search)) &&
          (city === "todas" || p.city === city) &&
          (verification === "todas" || p.verification === verification),
      ),
    [producers, search, city, verification],
  );

  const detail = producers.find((p) => p.id === selected) ?? null;

  if (detail) return <ProducerDetail producer={detail} onBack={() => setSelected(null)} />;

  return (
    <AdminLayout title="Produtores" description="Todos os produtores cadastrados na Entrô.">
      <div className="mb-4 flex flex-wrap gap-3">
        <Input placeholder="Buscar por nome, e-mail ou documento" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-72" />
        <div className="w-44">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger aria-label="Filtrar por cidade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as cidades</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={verification} onValueChange={setVerification}>
            <SelectTrigger aria-label="Filtrar por verificação"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as verificações</SelectItem>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
              <SelectItem value="Em análise">Em análise</SelectItem>
              <SelectItem value="Recusado">Recusado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PanelCard>
        <div className="space-y-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className="w-full rounded-xl border border-border p-4 text-left transition-colors hover:border-foreground"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-base font-extrabold">{p.name}</p>
                <div className="flex flex-wrap gap-1">
                  {p.blocked ? <Badge variant="destructive">Bloqueado</Badge> : null}
                  {p.risk ? <Badge className="bg-sun text-ink">Risco</Badge> : null}
                  <StatusPill status={p.verification} />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.type} · {p.document} · {p.city}</p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <p>Eventos: <span className="font-semibold text-foreground">{p.eventsCount}</span></p>
                <p>Volume: <span className="font-semibold text-foreground">{brl(p.volume)}</span></p>
                <p>Saldo: <span className="font-semibold text-foreground">{brl(p.balance)}</span></p>
                <p>Cadastro: <span className="font-semibold text-foreground">{shortDate(p.createdAt)}</span></p>
              </div>
            </button>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produtor encontrado.</p> : null}
        </div>
      </PanelCard>
    </AdminLayout>
  );
}

function ProducerDetail({ producer, onBack }: { producer: AdminProducer; onBack: () => void }) {
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const events = producerEvents(producer.id);
  const producerOrders = orders.filter((o) => events.some((e) => e.id === o.eventId));
  const producerRefunds = refunds.filter((r) => events.some((e) => e.id === r.eventId));
  const producerChargebacks = chargebacks.filter((c) => events.some((e) => e.id === c.eventId));

  return (
    <AdminLayout
      title={producer.name}
      description={`${producer.type} · ${producer.document}`}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={onBack}>Voltar</Button>
          <Button size="sm" variant="outline" onClick={() => adminActions.markRisk(producer.id, !producer.risk)}>
            {producer.risk ? "Desmarcar risco" : "Marcar como risco"}
          </Button>
          {producer.blocked ? (
            <Button size="sm" onClick={() => adminActions.unblockProducer(producer.id)}>Desbloquear produtor</Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setBlockOpen(true)}>Bloquear produtor</Button>
          )}
        </>
      }
    >
      {producer.blocked ? (
        <div className="mb-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-4">
          <p className="font-display text-base font-extrabold text-destructive">Produtor bloqueado</p>
          <p className="mt-1 text-sm text-destructive">Vendas e saques estão pausados. Motivo: {producer.blockReason}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Verificação" value={producer.verification} />
        <StatCard label="Eventos" value={String(producer.eventsCount)} />
        <StatCard label="Volume vendido" value={brl(producer.volume)} tone="primary" />
        <StatCard label="Saldo atual" value={brl(producer.balance)} tone="sun" />
      </div>

      <PanelCard title="Dados cadastrais" className="mt-5">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>E-mail: <span className="font-semibold">{producer.email}</span></p>
          <p>WhatsApp: <span className="font-semibold">{producer.whatsapp}</span></p>
          <p>Cidade: <span className="font-semibold">{producer.city}</span></p>
          <p>Cadastro: <span className="font-semibold">{shortDate(producer.createdAt)}</span></p>
        </div>
      </PanelCard>

      <PanelCard title="Documentos enviados" className="mt-5">
        <div className="space-y-2 text-sm">
          {producer.documents.length === 0 ? <p className="text-muted-foreground">Nenhum documento enviado.</p> : null}
          {producer.documents.map((d) => (
            <div key={d.name} className="flex justify-between rounded-lg border border-border px-3 py-2">
              <span>{d.name} <span className="text-muted-foreground">({d.kind})</span></span>
              <span className="text-muted-foreground">{shortDate(d.sentAt)}</span>
            </div>
          ))}
        </div>
      </PanelCard>

      <ProducerControls producerId={producer.id} />

      <PanelCard title="Eventos" className="mt-5">
        <div className="divide-y divide-border text-sm">
          {events.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{e.name}</span>
              <StatusPill status={e.status} />
            </div>
          ))}
          {events.length === 0 ? <p className="text-muted-foreground">Nenhum evento cadastrado.</p> : null}
        </div>
      </PanelCard>

      <PanelCard title="Extrato" className="mt-5">
        <div className="divide-y divide-border text-sm">
          {producerOrders.slice(0, 10).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{o.number} · {shortDateTime(o.purchasedAt)}</span>
              <strong>{brl(o.net)}</strong>
            </div>
          ))}
          {producerOrders.length === 0 ? <p className="text-muted-foreground">Sem pedidos.</p> : null}
        </div>
      </PanelCard>

      <PanelCard title="Reembolsos e chargebacks" className="mt-5">
        <div className="space-y-2 text-sm">
          {producerRefunds.map((r) => (
            <div key={r.id} className="flex justify-between"><span>Reembolso {r.buyer} — {r.rule}</span><strong>{brl(r.amount)}</strong></div>
          ))}
          {producerChargebacks.map((c) => (
            <div key={c.id} className="flex justify-between"><span>Chargeback {c.buyer}</span><StatusPill status={c.status} /></div>
          ))}
          {producerRefunds.length === 0 && producerChargebacks.length === 0 ? <p className="text-muted-foreground">Nenhum registro.</p> : null}
        </div>
      </PanelCard>

      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear produtor</AlertDialogTitle>
            <AlertDialogDescription>Vendas e saques serão pausados imediatamente. Informe o motivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="block-reason">Motivo</Label>
            <Textarea id="block-reason" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ex.: suspeita de fraude" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!blockReason.trim()}
              onClick={() => {
                adminActions.blockProducer(producer.id, blockReason.trim());
                setBlockReason("");
                setBlockOpen(false);
              }}
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function pctText(v: number) {
  return (v * 100).toString().replace(".", ",");
}

function ProducerControls({ producerId }: { producerId: string }) {
  const { producerOverrides } = useAdmin();
  const current = producerOverrides[producerId] ?? defaultOverride;
  const [form, setForm] = useState({
    pixFee: pctText(current.pixFee),
    cardFee: pctText(current.cardFee),
    advanceFee: pctText(current.advanceFee),
    anticipationMargin: pctText(current.anticipationMargin),
    advanceLimit: String(current.advanceLimit),
  });
  const [reason, setReason] = useState(current.withdrawBlockReason);

  const num = (v: string) => Number(v.replace(",", ".")) || 0;

  return (
    <PanelCard title="Controles financeiros deste vendedor" className="mt-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`pix-${producerId}`}>Taxa Pix (%)</Label>
          <Input id={`pix-${producerId}`} value={form.pixFee} onChange={(e) => setForm((f) => ({ ...f, pixFee: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor={`card-${producerId}`}>Taxa cartão (%)</Label>
          <Input id={`card-${producerId}`} value={form.cardFee} onChange={(e) => setForm((f) => ({ ...f, cardFee: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor={`adv-${producerId}`}>Taxa de adiantamento (%)</Label>
          <Input id={`adv-${producerId}`} value={form.advanceFee} onChange={(e) => setForm((f) => ({ ...f, advanceFee: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor={`ant-${producerId}`}>Margem de antecipação (%)</Label>
          <Input id={`ant-${producerId}`} value={form.anticipationMargin} onChange={(e) => setForm((f) => ({ ...f, anticipationMargin: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor={`limit-${producerId}`}>Limite de antecipação (R$)</Label>
          <Input id={`limit-${producerId}`} value={form.advanceLimit} onChange={(e) => setForm((f) => ({ ...f, advanceLimit: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor={`reason-${producerId}`}>Motivo da trava de saque</Label>
          <Input id={`reason-${producerId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: análise de risco" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            adminActions.setProducerOverride(producerId, {
              pixFee: num(form.pixFee) / 100,
              cardFee: num(form.cardFee) / 100,
              advanceFee: num(form.advanceFee) / 100,
              anticipationMargin: num(form.anticipationMargin) / 100,
              advanceLimit: num(form.advanceLimit),
            });
            toast.success("Taxas e limites deste vendedor atualizados.");
          }}
        >
          Salvar taxas e limites
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const blocked = !current.withdrawBlocked;
            adminActions.setProducerOverride(producerId, { withdrawBlocked: blocked, withdrawBlockReason: blocked ? reason : "" });
            toast.success(blocked ? "Saques travados para este vendedor." : "Saques liberados para este vendedor.");
          }}
        >
          {current.withdrawBlocked ? "Liberar saque" : "Travar saque"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const next = current.advanceLimit + 1000;
            setForm((f) => ({ ...f, advanceLimit: String(next) }));
            adminActions.setProducerOverride(producerId, { advanceLimit: next });
            toast.success("Limite de antecipação aumentado em R$ 1.000.");
          }}
        >
          Aumentar antecipação
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const next = Math.max(0, current.advanceLimit - 1000);
            setForm((f) => ({ ...f, advanceLimit: String(next) }));
            adminActions.setProducerOverride(producerId, { advanceLimit: next });
            toast.success("Limite de antecipação reduzido em R$ 1.000.");
          }}
        >
          Diminuir antecipação
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Situação atual: saque {current.withdrawBlocked ? "travado" : "liberado"} · limite de antecipação {brl(current.advanceLimit)}.
      </p>
    </PanelCard>
  );
}
