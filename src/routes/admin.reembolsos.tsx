import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout, PanelCard, StatusPill } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db } from "@/integrations/meu-supabase/client";
import type { Enums, Tables } from "@/integrations/meu-supabase/types";
import { useAuth } from "@/lib/auth";
import { CHARGEBACK_STATUS_LABELS, fetchProfilesMap, logAudit } from "@/lib/admin-store";
import { brl, shortDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/reembolsos")({
  head: () => ({ meta: [{ title: "Reembolsos e chargebacks — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminRefunds,
});

const REFUND_RULE_LABELS: Record<Enums<"refund_rule">, string> = {
  withdrawal_7d: "Arrependimento (7 dias)",
  cancellation_fee: "Cancelamento com taxa",
  event_canceled: "Evento cancelado",
  admin: "Solicitado pelo admin",
};

type RefundRow = Tables<"refunds"> & { events: { title: string } | null };
type ChargebackRow = Tables<"chargebacks"> & { events: { title: string } | null };
type OrderMini = Pick<Tables<"orders">, "id" | "code" | "buyer_id" | "event_id">;
type Profile = Tables<"profiles">;

async function loadOrdersAndProfiles(orderIds: string[]) {
  if (orderIds.length === 0) return { orders: new Map<string, OrderMini>(), profiles: {} as Record<string, Profile> };
  const { data, error } = await db.from("orders").select("id, code, buyer_id, event_id").in("id", orderIds);
  if (error) throw error;
  const orders = new Map((data ?? []).map((o) => [o.id, o]));
  const profiles = await fetchProfilesMap((data ?? []).map((o) => o.buyer_id));
  return { orders, profiles };
}

function useRefunds() {
  return useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data, error } = await db.from("refunds").select("*, events(title)").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      const refunds = (data ?? []) as unknown as RefundRow[];
      const { orders, profiles } = await loadOrdersAndProfiles(refunds.map((r) => r.order_id));
      return { refunds, orders, profiles };
    },
  });
}

function useChargebacks() {
  return useQuery({
    queryKey: ["admin-chargebacks"],
    queryFn: async () => {
      const { data, error } = await db.from("chargebacks").select("*, events(title)").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      const chargebacks = (data ?? []) as unknown as ChargebackRow[];
      const { orders, profiles } = await loadOrdersAndProfiles(chargebacks.map((c) => c.order_id));
      return { chargebacks, orders, profiles };
    },
  });
}

function useChargebackEvidence(ticketOrderId: string | null) {
  return useQuery({
    queryKey: ["admin-chargeback-evidence", ticketOrderId],
    enabled: !!ticketOrderId,
    queryFn: async () => {
      if (!ticketOrderId) return { tickets: [], checkins: [] };
      const { data: tickets, error: ticketsError } = await db.from("tickets").select("*").eq("order_id", ticketOrderId);
      if (ticketsError) throw ticketsError;
      const ticketIds = (tickets ?? []).map((t) => t.id);
      let checkins: Tables<"checkins">[] = [];
      if (ticketIds.length > 0) {
        const { data, error } = await db.from("checkins").select("*").in("ticket_id", ticketIds);
        if (error) throw error;
        checkins = data ?? [];
      }
      return { tickets: tickets ?? [], checkins };
    },
  });
}

function daysLeft(deadline: string | null) {
  if (!deadline) return null;
  return Math.ceil((+new Date(deadline) - Date.now()) / 86400000);
}

function AdminRefunds() {
  const refundsQuery = useRefunds();
  const chargebacksQuery = useChargebacks();
  const [selected, setSelected] = useState<string | null>(null);

  const selectedCb = chargebacksQuery.data?.chargebacks.find((c) => c.id === selected) ?? null;
  if (selectedCb) {
    const order = chargebacksQuery.data?.orders.get(selectedCb.order_id) ?? null;
    const buyer = order ? chargebacksQuery.data?.profiles[order.buyer_id] ?? null : null;
    return <ChargebackDetail cb={selectedCb} order={order} buyer={buyer} onBack={() => setSelected(null)} />;
  }

  return (
    <AdminLayout title="Reembolsos e chargebacks" description="Acompanhamento de devoluções e disputas de pagamento.">
      <Tabs defaultValue="reembolsos">
        <TabsList>
          <TabsTrigger value="reembolsos">Reembolsos</TabsTrigger>
          <TabsTrigger value="chargebacks">Chargebacks</TabsTrigger>
        </TabsList>
        <TabsContent value="reembolsos" className="mt-4">
          {refundsQuery.isError ? (
            <ErrorState description="Não conseguimos carregar os reembolsos." onRetry={() => refundsQuery.refetch()} />
          ) : refundsQuery.isLoading || !refundsQuery.data ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : (
            <PanelCard>
              <div className="divide-y divide-border">
                {refundsQuery.data.refunds.map((r) => {
                  const order = refundsQuery.data.orders.get(r.order_id);
                  const buyer = order ? refundsQuery.data.profiles[order.buyer_id] : undefined;
                  return (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="font-display text-sm font-extrabold">{buyer?.full_name ?? "Comprador"}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.events?.title ?? "—"} · {REFUND_RULE_LABELS[r.rule]} · {shortDateTime(r.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <strong className="text-sm">{brl(r.amount)}</strong>
                        <StatusPill status={r.status} />
                      </div>
                    </div>
                  );
                })}
                {refundsQuery.data.refunds.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum reembolso registrado.</p> : null}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                A efetivação do reembolso ao comprador depende da integração com o gateway de pagamento (Asaas) e não é executada por este painel.
              </p>
            </PanelCard>
          )}
        </TabsContent>
        <TabsContent value="chargebacks" className="mt-4">
          {chargebacksQuery.isError ? (
            <ErrorState description="Não conseguimos carregar os chargebacks." onRetry={() => chargebacksQuery.refetch()} />
          ) : chargebacksQuery.isLoading || !chargebacksQuery.data ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
          ) : (
            <PanelCard>
              <div className="space-y-3">
                {chargebacksQuery.data.chargebacks.map((c) => {
                  const left = daysLeft(c.defense_deadline);
                  const order = chargebacksQuery.data.orders.get(c.order_id);
                  const buyer = order ? chargebacksQuery.data.profiles[order.buyer_id] : undefined;
                  return (
                    <button key={c.id} onClick={() => setSelected(c.id)} className="w-full rounded-xl border border-border p-4 text-left">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-display text-sm font-extrabold">{buyer?.full_name ?? "Comprador"}</p>
                        <StatusPill status={c.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.events?.title ?? "—"} · Aberto em {shortDateTime(c.created_at)}</p>
                      <p className="mt-2 text-sm font-semibold">
                        {c.status === "open"
                          ? left !== null
                            ? left >= 0
                              ? `${left} dia(s) restantes para enviar defesa`
                              : "Prazo de defesa vencido"
                            : "Sem prazo definido"
                          : brl(c.amount)}
                      </p>
                    </button>
                  );
                })}
                {chargebacksQuery.data.chargebacks.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum chargeback registrado.</p> : null}
              </div>
            </PanelCard>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function ChargebackDetail({
  cb,
  order,
  buyer,
  onBack,
}: {
  cb: ChargebackRow;
  order: OrderMini | null;
  buyer: Profile | null;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const evidence = useChargebackEvidence(order?.id ?? null);
  const [notes, setNotes] = useState(cb.defense_notes ?? "");
  const [fileRef, setFileRef] = useState("");
  const left = daysLeft(cb.defense_deadline);

  const sendDefense = async () => {
    try {
      const files = [...(cb.defense_files ?? []), ...(fileRef.trim() ? [fileRef.trim()] : [])];
      const { error } = await db
        .from("chargebacks")
        .update({ status: "in_defense", defense_notes: notes.trim(), defense_files: files })
        .eq("id", cb.id);
      if (error) throw error;
      await logAudit({ actorId: user?.id ?? null, action: "send_chargeback_defense", entity: "chargebacks", entityId: cb.id, details: { notes: notes.trim(), files } });
      toast.success("Defesa enviada.");
      qc.invalidateQueries({ queryKey: ["admin-chargebacks"] });
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a defesa.");
    }
  };

  return (
    <AdminLayout
      title={`Chargeback — ${buyer?.full_name ?? "Comprador"}`}
      description={cb.events?.title ?? ""}
      actions={<Button size="sm" variant="outline" onClick={onBack}>Voltar</Button>}
    >
      <div className="mb-4 rounded-2xl border-2 border-foreground bg-sun p-4 text-ink shadow-pop">
        <p className="font-display text-base font-extrabold">
          {cb.status === "open"
            ? left !== null
              ? left >= 0
                ? `${left} dia(s) restantes para enviar a defesa`
                : "Prazo vencido"
              : "Sem prazo definido"
            : `Status: ${CHARGEBACK_STATUS_LABELS[cb.status]}`}
        </p>
      </div>

      <PanelCard title="Dados do pedido">
        <div className="space-y-1 text-sm">
          <p>Pedido: <span className="font-semibold">{order?.code ?? "—"}</span></p>
          <p>Comprador: <span className="font-semibold">{buyer?.full_name ?? "—"}</span></p>
          <p>CPF: <span className="font-semibold">{buyer?.cpf ?? "—"}</span></p>
          <p>E-mail: <span className="font-semibold">{buyer?.email ?? "—"}</span></p>
          <p>Valor contestado: <span className="font-semibold">{brl(cb.amount)}</span></p>
          <p>Motivo informado pelo emissor: <span className="font-semibold">{cb.reason ?? "—"}</span></p>
        </div>
      </PanelCard>

      <PanelCard title="Evidências de check-in" className="mt-5">
        {evidence.isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : (evidence.data?.checkins.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum check-in registrado para os ingressos deste pedido.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {evidence.data?.checkins.map((k) => (
              <p key={k.id}>
                Check-in <strong>{k.result}</strong> em <strong>{shortDateTime(k.scanned_at)}</strong>{k.device_id ? ` · dispositivo ${k.device_id}` : ""}
              </p>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Montar defesa" className="mt-5">
        <div className="space-y-3 text-sm">
          <div>
            <Label htmlFor="defense-notes">Observações da defesa</Label>
            <Textarea id="defense-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Descreva os elementos que comprovam a legitimidade da compra" />
          </div>
          <div>
            <Label htmlFor="defense-file">Referência de documento (nome/link do arquivo já hospedado)</Label>
            <Input id="defense-file" placeholder="nome-do-arquivo.pdf" value={fileRef} onChange={(e) => setFileRef(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Este painel não faz upload de arquivos; registre a referência de um documento já armazenado.</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(cb.defense_files ?? []).map((d) => (
              <span key={d} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{d}</span>
            ))}
          </div>
          {cb.status === "open" ? (
            <Button onClick={sendDefense}>Enviar defesa</Button>
          ) : (
            <p className="text-muted-foreground">Status atual: {CHARGEBACK_STATUS_LABELS[cb.status]}. O resultado final da disputa depende da bandeira/adquirente.</p>
          )}
        </div>
      </PanelCard>
    </AdminLayout>
  );
}
