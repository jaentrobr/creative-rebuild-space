import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { eventById, type AdminOrder } from "@/data/admin";
import { brl, shortDateTime } from "@/lib/format";
import { adminActions, useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminOrders,
});

function AdminOrders() {
  const { orders } = useAdmin();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders.slice(0, 25);
    return orders.filter((o) => o.number.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.cpf.includes(q));
  }, [orders, search]);

  const detail = orders.find((o) => o.id === selected) ?? null;
  if (detail) return <OrderDetail order={detail} onBack={() => setSelected(null)} />;

  return (
    <AdminLayout title="Pedidos" description="Busque por número, e-mail ou CPF do comprador.">
      <div className="mb-4">
        <Input placeholder="Buscar por número, e-mail ou CPF" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-96" />
      </div>
      <PanelCard>
        <div className="divide-y divide-border">
          {filtered.map((o) => (
            <button key={o.id} onClick={() => setSelected(o.id)} className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left">
              <div>
                <p className="font-display text-sm font-extrabold">{o.number} · {o.buyer}</p>
                <p className="text-xs text-muted-foreground">{o.email} · {shortDateTime(o.purchasedAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <strong className="text-sm">{brl(o.gross)}</strong>
                <StatusPill status={o.status} />
              </div>
            </button>
          ))}
          {filtered.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum pedido encontrado.</p> : null}
        </div>
      </PanelCard>
    </AdminLayout>
  );
}

function OrderDetail({ order, onBack }: { order: AdminOrder; onBack: () => void }) {
  const event = eventById(order.eventId);
  const [refundOpen, setRefundOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <AdminLayout
      title={order.number}
      description={event?.name ?? ""}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={onBack}>Voltar</Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              adminActions.resendTickets(order.id);
              toast.success("Ingressos reenviados por e-mail.");
            }}
          >
            Reenviar ingressos por e-mail
          </Button>
          {order.status !== "Reembolsado" && order.status !== "Cancelado" ? (
            <Button size="sm" variant="destructive" onClick={() => { setConfirmStep(false); setRefundOpen(true); }}>
              Estornar pedido
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Comprador">
          <div className="space-y-1 text-sm">
            <p>Nome: <span className="font-semibold">{order.buyer}</span></p>
            <p>E-mail: <span className="font-semibold">{order.email}</span></p>
            <p>CPF: <span className="font-semibold">{order.cpf}</span></p>
          </div>
        </PanelCard>
        <PanelCard title="Ingressos e pagamento">
          <div className="space-y-1 text-sm">
            <p>Ingressos: <span className="font-semibold">{order.ticketDescription}</span></p>
            <p>Forma de pagamento: <span className="font-semibold">{order.payment}{order.payment === "Cartão" ? ` · ${order.installments}x` : ""}</span></p>
            <p>Valor bruto: <span className="font-semibold">{brl(order.gross)}</span></p>
            <p>Taxas: <span className="font-semibold">{brl(order.fee)}</span></p>
            <p>Valor líquido ao produtor: <span className="font-semibold">{brl(order.net)}</span></p>
            <p>Status: <StatusPill status={order.status} /></p>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Histórico" className="mt-5">
        <div className="space-y-2 text-sm">
          {order.history.map((h, i) => (
            <div key={i} className="flex justify-between"><span>{h.label}</span><span className="text-muted-foreground">{shortDateTime(h.at)}</span></div>
          ))}
        </div>
      </PanelCard>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmStep ? "Confirmar estorno" : "Estornar pedido"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStep
                ? "Essa ação é irreversível e o valor será devolvido ao comprador. Confirma o estorno?"
                : "Informe o motivo do estorno."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!confirmStep ? (
            <div className="space-y-1">
              <Label htmlFor="refund-reason">Motivo</Label>
              <Textarea id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: solicitação do comprador" />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!confirmStep ? (
              <AlertDialogAction disabled={!reason.trim()} onClick={(e) => { e.preventDefault(); setConfirmStep(true); }}>
                Continuar
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={() => {
                  adminActions.refundOrder(order.id, reason.trim());
                  setRefundOpen(false);
                  setConfirmStep(false);
                  setReason("");
                  toast.success("Pedido estornado.");
                }}
              >
                Confirmar estorno
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
