import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { downloadTicketPdf } from "@/lib/ticket-pdf";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { brl, shortDate } from "@/lib/format";

export const Route = createFileRoute("/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — Entrô" },
      {
        name: "description",
        content: "Histórico de pedidos com valores, taxas e forma de pagamento.",
      },
      { property: "og:title", content: "Meus pedidos — Entrô" },
      { property: "og:description", content: "Acompanhe suas compras na Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <OrdersPage />
    </RequireAuth>
  ),
});

type OrderWithEvent = Tables<"orders"> & {
  events: Pick<Tables<"events">, "id" | "slug" | "title"> | null;
};

type TicketWithEvent = Tables<"tickets"> & {
  events: Tables<"events"> | null;
  ticket_types: Pick<Tables<"ticket_types">, "id" | "name"> | null;
  lots: Pick<Tables<"lots">, "id" | "name"> | null;
};

const paymentLabel: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  free: "Gratuito",
};

function useMyOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*, events(id, slug, title)")
        .eq("buyer_id", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrderWithEvent[];
    },
  });
}

function useOrderTickets(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["order-tickets", orderId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("tickets")
        .select("*, events(*), ticket_types(id, name), lots(id, name)")
        .eq("order_id", orderId);
      if (error) throw error;
      return (data ?? []) as unknown as TicketWithEvent[];
    },
  });
}

function OrdersPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useMyOrders(user?.id);
  const [open, setOpen] = useState<string | null>(null);
  const orders = data ?? [];

  return (
    <PageShell className="max-w-3xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Meus pedidos</h1>
      <p className="mt-2 text-muted-foreground">Histórico das suas compras na Entrô.</p>

      {isLoading && (
        <div className="mt-7 grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {isError && !isLoading && (
        <p className="mt-7 rounded-xl bg-secondary p-5 text-sm font-semibold text-destructive">
          Não foi possível carregar seus pedidos. Tente novamente em instantes.
        </p>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <div className="mt-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
            <Package className="size-7 text-primary" />
          </div>
          <p className="mt-4 font-bold">Você ainda não fez nenhum pedido</p>
        </div>
      )}

      {!isLoading && !isError && orders.length > 0 && (
        <div className="mt-7 grid gap-3">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              expanded={open === order.id}
              onToggle={() => setOpen(open === order.id ? null : order.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function OrderRow({
  order,
  expanded,
  onToggle,
}: {
  order: OrderWithEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: orderTickets, isError: ticketsError } = useOrderTickets(order.id, expanded);
  const tickets = orderTickets ?? [];
  const downloadable = tickets.filter((t) => t.status === "valid" || t.status === "used");
  const [downloading, setDownloading] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button className="flex w-full items-center gap-3 p-4 text-left" onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase text-primary">
            {order.code} · {shortDate(order.created_at)}
          </p>
          <p className="truncate text-lg font-bold">{order.events?.title ?? "Evento"}</p>
          <p className="text-sm text-muted-foreground">
            {paymentLabel[order.payment_method] ?? order.payment_method}
          </p>
        </div>
        <strong className="shrink-0">{brl(Number(order.total))}</strong>
        <ChevronDown
          className={`size-5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="grid gap-3 border-t border-border p-4 text-sm">
          <div className="grid gap-1">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Ingressos</span>
              <span>{brl(Number(order.subtotal))}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Taxa de serviço</span>
              <span>{brl(Number(order.service_fee))}</span>
            </p>
            {Number(order.discount) > 0 && (
              <p className="flex justify-between">
                <span className="text-muted-foreground">Desconto</span>
                <span>-{brl(Number(order.discount))}</span>
              </p>
            )}
            <p className="flex justify-between font-bold">
              <span>Total</span>
              <span>{brl(Number(order.total))}</span>
            </p>
          </div>
          {ticketsError && (
            <p className="text-sm font-semibold text-destructive">
              Não foi possível carregar os ingressos deste pedido.
            </p>
          )}
          {downloadable.length > 0 && (
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  for (const ticket of downloadable) {
                    if (ticket.events) await downloadTicketPdf(ticket, ticket.events);
                  }
                } catch (error) {
                  toast.error(friendlyError(error as Error, "Não foi possível gerar o PDF agora."));
                } finally {
                  setDownloading(false);
                }
              }}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Baixar todos os ingressos (PDF)
            </Button>
          )}
          <div className="grid gap-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to="/meus-ingressos/$id"
                params={{ id: ticket.id }}
                className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 font-semibold"
              >
                <span>
                  {ticket.ticket_types?.name ?? "Ingresso"} · {ticket.lots?.name ?? ""}
                </span>
                <span className="text-primary">{ticket.status} →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
