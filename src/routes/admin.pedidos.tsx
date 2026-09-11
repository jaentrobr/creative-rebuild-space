import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout, PanelCard, StatusPill } from "@/components/admin/admin-layout";
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
import { ErrorState } from "@/components/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { useAuth } from "@/lib/auth";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PROCESS_STATUS_LABELS,
  fetchProfilesMap,
  logAudit,
} from "@/lib/admin-store";
import { brl, shortDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({
    meta: [{ title: "Pedidos — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminOrders,
});

type OrderRow = Tables<"orders"> & { events: { title: string } | null };
type Profile = Tables<"profiles">;

function useOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*, events(title)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const orders = (data ?? []) as unknown as OrderRow[];
      const profiles = await fetchProfilesMap(orders.map((o) => o.buyer_id));
      return { orders, profiles };
    },
  });
}

function useOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ["admin-order-detail", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return { tickets: [], refunds: [] };
      const [ticketsRes, refundsRes] = await Promise.all([
        db
          .from("tickets")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
        db
          .from("refunds")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
      ]);
      if (ticketsRes.error) throw ticketsRes.error;
      if (refundsRes.error) throw refundsRes.error;
      return { tickets: ticketsRes.data ?? [], refunds: refundsRes.data ?? [] };
    },
  });
}

function AdminOrders() {
  const { data, isLoading, isError, refetch } = useOrders();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const orders = data?.orders ?? [];
    const profiles = data?.profiles ?? {};
    const q = search.trim().toLowerCase();
    if (!q) return orders.slice(0, 30);
    return orders.filter((o) => {
      const p = profiles[o.buyer_id];
      return (
        o.code.toLowerCase().includes(q) ||
        (p?.email ?? "").toLowerCase().includes(q) ||
        (p?.cpf ?? "").includes(q)
      );
    });
  }, [data, search]);

  const selectedOrder = data?.orders.find((o) => o.id === selected) ?? null;
  const selectedProfile = selectedOrder ? (data?.profiles[selectedOrder.buyer_id] ?? null) : null;

  if (selectedOrder) {
    return (
      <OrderDetail order={selectedOrder} buyer={selectedProfile} onBack={() => setSelected(null)} />
    );
  }

  return (
    <AdminLayout title="Pedidos" description="Busque por código, e-mail ou CPF do comprador.">
      <div className="mb-4">
        <Input
          placeholder="Buscar por código, e-mail ou CPF"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96"
        />
      </div>
      {isError ? (
        <ErrorState description="Não conseguimos carregar os pedidos." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <PanelCard>
          <div className="divide-y divide-border">
            {filtered.map((o) => {
              const p = data.profiles[o.buyer_id];
              return (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left"
                >
                  <div>
                    <p className="font-display text-sm font-extrabold">
                      {o.code} · {p?.full_name ?? "Comprador"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p?.email ?? "—"} · {o.events?.title ?? "—"} · {shortDateTime(o.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="text-sm">{brl(o.total)}</strong>
                    <StatusPill status={o.status} />
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
            ) : null}
          </div>
        </PanelCard>
      )}
    </AdminLayout>
  );
}

function OrderDetail({
  order,
  buyer,
  onBack,
}: {
  order: OrderRow;
  buyer: Profile | null;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const detail = useOrderDetail(order.id);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState("");
  const canRequestRefund = order.status === "paid" || order.status === "partially_refunded";

  const requestRefund = async () => {
    try {
      const { error } = await db.from("refunds").insert({
        order_id: order.id,
        event_id: order.event_id,
        rule: "admin",
        amount: order.total,
        fee_retained: 0,
        status: "requested",
        reason: reason.trim(),
        requested_by: user?.id ?? null,
      });
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "request_refund",
        entity: "orders",
        entityId: order.id,
        details: { reason: reason.trim(), amount: order.total },
      });
      toast.success(
        "Estorno solicitado. O processamento efetivo depende da integração com o gateway de pagamento.",
      );
      setReason("");
      setRefundOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-order-detail", order.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível solicitar o estorno.");
    }
  };

  return (
    <AdminLayout
      title={order.code}
      description={order.events?.title ?? ""}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled
            title="Envio de e-mail depende de um serviço de notificações que não está disponível neste painel."
          >
            Reenviar ingressos por e-mail
          </Button>
          {canRequestRefund ? (
            <Button size="sm" variant="destructive" onClick={() => setRefundOpen(true)}>
              Solicitar estorno
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Comprador">
          <div className="space-y-1 text-sm">
            <p>
              Nome: <span className="font-semibold">{buyer?.full_name ?? "—"}</span>
            </p>
            <p>
              E-mail: <span className="font-semibold">{buyer?.email ?? "—"}</span>
            </p>
            <p>
              CPF: <span className="font-semibold">{buyer?.cpf ?? "—"}</span>
            </p>
          </div>
        </PanelCard>
        <PanelCard title="Pagamento">
          <div className="space-y-1 text-sm">
            <p>
              Forma de pagamento:{" "}
              <span className="font-semibold">
                {PAYMENT_METHOD_LABELS[order.payment_method]}
                {order.payment_method === "credit_card" ? ` · ${order.installments}x` : ""}
              </span>
            </p>
            <p>
              Subtotal: <span className="font-semibold">{brl(order.subtotal)}</span>
            </p>
            <p>
              Desconto: <span className="font-semibold">{brl(order.discount)}</span>
            </p>
            <p>
              Taxa de serviço: <span className="font-semibold">{brl(order.service_fee)}</span>
            </p>
            <p>
              Total: <span className="font-semibold">{brl(order.total)}</span>
            </p>
            <p>
              Status: <StatusPill status={order.status} />
            </p>
            <p>
              Pago em:{" "}
              <span className="font-semibold">
                {order.paid_at ? shortDateTime(order.paid_at) : "—"}
              </span>
            </p>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Ingressos" className="mt-5">
        {detail.isError ? (
          <ErrorState
            description="Não conseguimos carregar os ingressos."
            onRetry={() => detail.refetch()}
          />
        ) : detail.isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : (
          <div className="divide-y divide-border text-sm">
            {(detail.data?.tickets ?? []).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {t.holder_name} · {t.holder_email ?? "—"}
                </span>
                <StatusPill status={t.status} />
              </div>
            ))}
            {(detail.data?.tickets ?? []).length === 0 ? (
              <p className="py-2 text-muted-foreground">Nenhum ingresso neste pedido.</p>
            ) : null}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Reembolsos solicitados" className="mt-5">
        {detail.isLoading ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : (
          <div className="divide-y divide-border text-sm">
            {(detail.data?.refunds ?? []).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p>{r.reason || "Sem motivo informado"}</p>
                  <p className="text-xs text-muted-foreground">{shortDateTime(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <strong>{brl(r.amount)}</strong>
                  <StatusPill status={r.status} />
                </div>
              </div>
            ))}
            {(detail.data?.refunds ?? []).length === 0 ? (
              <p className="py-2 text-muted-foreground">
                Nenhum estorno solicitado para este pedido.
              </p>
            ) : null}
          </div>
        )}
      </PanelCard>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Solicitar estorno</AlertDialogTitle>
            <AlertDialogDescription>
              Isso registra um pedido de estorno ({PROCESS_STATUS_LABELS.requested}). A efetivação
              do reembolso ao comprador depende do gateway de pagamento e não é feita por este
              painel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="refund-reason">Motivo</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: solicitação do comprador"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim()}
              onClick={(e) => {
                e.preventDefault();
                requestRefund();
              }}
            >
              Confirmar solicitação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
