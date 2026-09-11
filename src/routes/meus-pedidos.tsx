import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { downloadTicketPdf } from "@/lib/ticket-pdf";
import { demoOrders } from "@/data/account";
import { findEvent } from "@/data/events";
import { useSession } from "@/lib/session";
import { brl, shortDate } from "@/lib/format";

export const Route = createFileRoute("/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — Entrô" },
      { name: "description", content: "Histórico de pedidos com valores, taxas e forma de pagamento." },
      { property: "og:title", content: "Meus pedidos — Entrô" },
      { property: "og:description", content: "Acompanhe suas compras na Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { tickets } = useSession();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <PageShell className="max-w-3xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Meus pedidos</h1>
      <p className="mt-2 text-muted-foreground">Compras de demonstração, sem cobrança real.</p>
      <div className="mt-7 grid gap-3">
        {demoOrders.map((order) => {
          const event = findEvent(order.eventSlug);
          const orderTickets = tickets.filter((ticket) => ticket.orderId === order.id);
          const expanded = open === order.id;
          return (
            <div key={order.id} className="rounded-xl border border-border bg-card">
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(expanded ? null : order.id)}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase text-primary">{order.number} · {shortDate(order.purchasedAt)}</p>
                  <p className="truncate text-lg font-bold">{event?.name}</p>
                  <p className="text-sm text-muted-foreground">{order.quantity} ingresso(s) · {order.payment}</p>
                </div>
                <strong className="shrink-0">{brl(order.total)}</strong>
                <ChevronDown className={`size-5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
              {expanded && (
                <div className="grid gap-3 border-t border-border p-4 text-sm">
                  <div className="grid gap-1">
                    <p className="flex justify-between"><span className="text-muted-foreground">Ingressos</span><span>{brl(order.subtotal)}</span></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Taxa de serviço</span><span>{brl(order.fee)}</span></p>
                    <p className="flex justify-between font-bold"><span>Total</span><span>{brl(order.total)}</span></p>
                  </div>
                  {orderTickets.some((ticket) => ticket.status === "Válido" || ticket.status === "Utilizado") && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={async () => {
                        for (const ticket of orderTickets.filter((t) => t.status === "Válido" || t.status === "Utilizado")) {
                          const event = findEvent(ticket.eventSlug);
                          if (event) await downloadTicketPdf(ticket, event);
                        }
                      }}
                    >
                      <Download className="size-4" /> Baixar todos os ingressos (PDF)
                    </Button>
                  )}
                  <div className="grid gap-2">
                    {orderTickets.map((ticket) => (
                      <Link key={ticket.id} to="/meus-ingressos/$id" params={{ id: ticket.id }} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 font-semibold">
                        <span>{ticket.type} · {ticket.lot}</span>
                        <span className="text-primary">{ticket.status} →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
