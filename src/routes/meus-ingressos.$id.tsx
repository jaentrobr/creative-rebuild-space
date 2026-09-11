import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarPlus, Download, MapPin, Send, RotateCcw, WifiOff } from "lucide-react";
import { downloadTicketPdf } from "@/lib/ticket-pdf";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { demoTickets, randomCode, refundPolicy, ticketEvent } from "@/data/account";
import { useSession, updateTicket } from "@/lib/session";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/meus-ingressos/$id")({
  loader: ({ params }) => {
    const ticket = demoTickets.find((item) => item.id === params.id);
    if (!ticket) throw notFound();
    return ticket;
  },
  head: () => ({
    meta: [
      { title: "Detalhe do ingresso — Entrô" },
      { name: "description", content: "QR code, dados do ingresso, transferência e reembolso." },
      { property: "og:title", content: "Detalhe do ingresso — Entrô" },
      { property: "og:description", content: "Seu ingresso com QR code disponível offline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TicketDetail,
});

function TicketDetail() {
  const { id } = Route.useParams();
  const { tickets } = useSession();
  const ticket = tickets.find((item) => item.id === id);
  const [transferOpen, setTransferOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "" });

  if (!ticket) return null;
  const event = ticketEvent(ticket);
  if (!event) return null;
  const policy = refundPolicy(ticket);
  const active = ticket.status === "Válido";

  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&details=${encodeURIComponent(`Ingresso Entrô · ${ticket.type}`)}&location=${encodeURIComponent(`${event.venue}, ${event.city}`)}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue} ${event.address} ${event.city}`)}`;

  return (
    <PageShell className="max-w-2xl">
      <Link to="/meus-ingressos" className="text-sm font-bold text-primary">← Meus ingressos</Link>
      <h1 className="mt-3 text-4xl font-bold">{event.name}</h1>

      <div className="mt-6 rounded-2xl border-2 border-ink bg-card p-6 text-center shadow-pop">
        <div className={`mx-auto w-fit rounded-xl border-2 border-ink bg-background p-4 ${active ? "" : "opacity-40"}`}>
          <QRCodeSVG value={ticket.code} size={200} />
        </div>
        <p className="mt-4 font-display text-lg font-extrabold tracking-wide">{ticket.code}</p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-extrabold">
          <WifiOff className="size-3.5" /> Disponível offline
        </span>
        {!active && <p className="mt-3 text-sm font-bold text-cta">Ingresso {ticket.status.toLowerCase()}</p>}
      </div>

      <dl className="mt-8 grid gap-3 rounded-xl border border-border p-5 text-sm">
        <Row label="Evento" value={event.name} />
        <Row label="Data e horário" value={`${event.date} · ${event.time}`} />
        <Row label="Local" value={<span className="flex flex-wrap items-center gap-2">{event.venue}, {event.city} <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-primary"><MapPin className="size-3.5" /> Ver no mapa</a></span>} />
        <Row label="Titular" value={`${ticket.holder} · ${ticket.holderDoc}`} />
        <Row label="Tipo e lote" value={`${ticket.type} · ${ticket.lot}`} />
        <Row label="Valor pago" value={`${brl(ticket.price)} + ${brl(ticket.fee)} de taxa`} />
      </dl>

      {ticket.half && (
        <p className="mt-4 rounded-xl bg-sun/30 p-4 text-sm font-semibold">
          Meia-entrada: leve o documento que comprova o benefício. Sem ele, a entrada pode ser recusada na portaria.
        </p>
      )}

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button className="gap-2" disabled={!active} onClick={() => setTransferOpen(true)}><Send className="size-4" /> Transferir ingresso</Button>
        <Button className="gap-2" disabled={!active} onClick={() => downloadTicketPdf(ticket, event)}><Download className="size-4" /> Baixar PDF</Button>
        <Button variant="outline" className="gap-2" disabled={!active} onClick={() => setRefundOpen(true)}><RotateCcw className="size-4" /> Solicitar reembolso</Button>
        <Button variant="outline" asChild className="gap-2"><a href={calendarUrl} target="_blank" rel="noreferrer"><CalendarPlus className="size-4" /> Adicionar à agenda</a></Button>
      </div>

      <div className="mt-6 rounded-xl bg-secondary p-5 text-sm">
        <p className="font-bold">Como funciona o reembolso</p>
        <ul className="mt-2 grid gap-1.5 text-muted-foreground">
          <li>Até 7 dias após a compra e com mais de 48h para o evento: devolvemos tudo.</li>
          <li>Depois de 7 dias e até 48h antes: devolvemos com taxa de cancelamento de 10%, se o produtor permitir.</li>
          <li>Com menos de 48h para o evento: reembolso não disponível.</li>
        </ul>
      </div>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir ingresso</DialogTitle>
            <DialogDescription>O QR code atual será cancelado e um novo será gerado para o novo titular.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Nome do novo titular" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="E-mail ou CPF do novo titular" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancelar</Button>
            <Button
              disabled={!form.name || !form.contact}
              onClick={() => {
                updateTicket(ticket.id, { status: "Transferido", holder: form.name, holderDoc: form.contact, code: randomCode() });
                setTransferOpen(false);
              }}
            >
              Confirmar transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar reembolso</DialogTitle>
            <DialogDescription>{policy.text}</DialogDescription>
          </DialogHeader>
          {policy.kind !== "none" && (
            <p className="rounded-xl bg-secondary p-4 font-bold">Você receberá de volta {brl(policy.amount)}.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Fechar</Button>
            {policy.kind !== "none" && (
              <Button
                onClick={() => {
                  updateTicket(ticket.id, { status: "Reembolsado" });
                  setRefundOpen(false);
                }}
              >
                Confirmar reembolso
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-xs font-extrabold uppercase text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
