import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout, PanelCard, StatusPill } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { eventById, orderById, refunds, type AdminChargeback } from "@/data/admin";
import { brl, shortDateTime } from "@/lib/format";
import { adminActions, useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/reembolsos")({
  head: () => ({ meta: [{ title: "Reembolsos e chargebacks — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminRefunds,
});

function daysLeft(deadline: string) {
  return Math.ceil((+new Date(deadline) - Date.now()) / 86400000);
}

function AdminRefunds() {
  const { chargebacks } = useAdmin();
  const [selected, setSelected] = useState<string | null>(null);
  const detail = chargebacks.find((c) => c.id === selected) ?? null;
  if (detail) return <ChargebackDetail cb={detail} onBack={() => setSelected(null)} />;

  return (
    <AdminLayout title="Reembolsos e chargebacks" description="Acompanhamento de devoluções e disputas de pagamento.">
      <Tabs defaultValue="reembolsos">
        <TabsList>
          <TabsTrigger value="reembolsos">Reembolsos</TabsTrigger>
          <TabsTrigger value="chargebacks">Chargebacks</TabsTrigger>
        </TabsList>
        <TabsContent value="reembolsos" className="mt-4">
          <PanelCard>
            <div className="divide-y divide-border">
              {refunds.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-display text-sm font-extrabold">{r.buyer}</p>
                    <p className="text-xs text-muted-foreground">{eventById(r.eventId)?.name ?? "—"} · {r.rule} · {shortDateTime(r.requestedAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="text-sm">{brl(r.amount)}</strong>
                    <StatusPill status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>
        </TabsContent>
        <TabsContent value="chargebacks" className="mt-4">
          <PanelCard>
            <div className="space-y-3">
              {chargebacks.map((c) => {
                const left = daysLeft(c.deadline);
                return (
                  <button key={c.id} onClick={() => setSelected(c.id)} className="w-full rounded-xl border border-border p-4 text-left">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-sm font-extrabold">{c.buyer}</p>
                      <StatusPill status={c.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{eventById(c.eventId)?.name ?? "—"} · Aberto em {shortDateTime(c.openedAt)}</p>
                    <p className="mt-2 text-sm font-semibold">
                      {c.status === "Aberto" ? (left >= 0 ? `${left} dia(s) restantes para enviar defesa` : "Prazo de defesa vencido") : brl(c.amount)}
                    </p>
                  </button>
                );
              })}
            </div>
          </PanelCard>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function ChargebackDetail({ cb, onBack }: { cb: AdminChargeback; onBack: () => void }) {
  const order = orderById(cb.orderId);
  const event = eventById(cb.eventId);
  const [extraDoc, setExtraDoc] = useState("");
  const left = daysLeft(cb.deadline);

  return (
    <AdminLayout
      title={`Chargeback — ${cb.buyer}`}
      description={event?.name ?? ""}
      actions={<Button size="sm" variant="outline" onClick={onBack}>Voltar</Button>}
    >
      <div className="mb-4 rounded-2xl border-2 border-foreground bg-sun p-4 text-ink shadow-pop">
        <p className="font-display text-base font-extrabold">
          {cb.status === "Aberto" ? (left >= 0 ? `${left} dia(s) restantes para enviar a defesa` : "Prazo vencido") : `Status: ${cb.status}`}
        </p>
      </div>

      <PanelCard title="Montar defesa">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox checked={cb.defense.cpfConfirmed} disabled />
            <span>CPF do comprador confere: <strong>{order?.cpf}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={cb.defense.emailConfirmed} disabled />
            <span>E-mail confere: <strong>{order?.email}</strong></span>
          </div>
          <p>Aceite dos termos em: <strong>{shortDateTime(cb.defense.termsAcceptedAt)}</strong></p>
          {cb.defense.checkin ? (
            <p>
              Check-in realizado às <strong>{shortDateTime(cb.defense.checkin.at)}</strong> por <strong>{cb.defense.checkin.gate}</strong> no aparelho{" "}
              <strong>{cb.defense.checkin.device}</strong>.
            </p>
          ) : (
            <p className="text-muted-foreground">Nenhum check-in registrado para este pedido.</p>
          )}
          <div>
            <Label htmlFor="extra-doc">Documento extra (simulado)</Label>
            <Input id="extra-doc" placeholder="nome-do-arquivo.pdf" value={extraDoc} onChange={(e) => setExtraDoc(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1">
            {[...cb.defense.extraDocuments, ...(extraDoc ? [extraDoc] : [])].map((d) => (
              <span key={d} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{d}</span>
            ))}
          </div>
          {cb.status === "Aberto" ? (
            <Button
              onClick={() => {
                adminActions.sendDefense(cb.id);
                toast.success("Defesa enviada.");
                onBack();
              }}
            >
              Enviar defesa
            </Button>
          ) : (
            <p className="text-muted-foreground">
              {cb.defense.sentAt ? `Defesa enviada em ${shortDateTime(cb.defense.sentAt)}.` : "Defesa em andamento."}
            </p>
          )}
        </div>
      </PanelCard>
    </AdminLayout>
  );
}
