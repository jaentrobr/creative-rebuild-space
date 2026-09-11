import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { CalendarPlus, Download, MapPin, Send, RotateCcw, WifiOff } from "lucide-react";
import { downloadTicketPdf } from "@/lib/ticket-pdf";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { brl, shortDateTime } from "@/lib/format";
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

const RESCHEDULE_ERROR_MESSAGES: Record<string, string> = {
  reschedule_not_allowed_status:
    "Não é possível alterar a data de um evento encerrado, cancelado ou suspenso",
  event_already_started: "O evento já começou",
  reschedule_limit_reached: "A data deste evento já foi alterada uma vez",
  reschedule_date_in_past: "Escolha uma data futura",
  reschedule_too_far: "A nova data deve ser em até 90 dias após a data prevista",
  reschedule_reason_required: "Informe o motivo da alteração (mínimo 10 caracteres)",
  ticket_not_valid: "Este ingresso não está mais válido",
  event_not_rescheduled: "Este evento não teve a data alterada",
  reschedule_choice_expired: "O prazo para escolher terminou",
  refund_already_requested: "O reembolso já foi solicitado",
};

function translateRescheduleError(message: string | undefined | null): string {
  if (!message) return "Ocorreu um erro. Tente novamente.";
  const key = Object.keys(RESCHEDULE_ERROR_MESSAGES).find((k) => message.includes(k));
  return key ? RESCHEDULE_ERROR_MESSAGES[key]! : message;
}

export const Route = createFileRoute("/meus-ingressos/$id")({
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
  component: () => (
    <RequireAuth>
      <TicketDetail />
    </RequireAuth>
  ),
});

type TicketDetailRow = Tables<"tickets"> & {
  events: Tables<"events"> | null;
  ticket_types: Pick<Tables<"ticket_types">, "id" | "name"> | null;
  lots: Pick<Tables<"lots">, "id" | "name"> | null;
};

const statusLabel: Record<string, string> = {
  valid: "Válido",
  used: "Utilizado",
  transferred: "Transferido",
  refunded: "Reembolsado",
  canceled: "Cancelado",
};

function useTicketDetail(id: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["my-ticket", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("tickets")
        .select("*, events(*), ticket_types(id, name), lots(id, name)")
        .eq("id", id)
        .eq("holder_user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as TicketDetailRow | null;
    },
  });
}

type RescheduleChoiceRow = Tables<"ticket_reschedule_choices">;
type EventReschedule = Tables<"event_reschedules">;

function useLastReschedule(eventId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["event-last-reschedule", eventId],
    enabled: !!eventId && enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("event_reschedules")
        .select("*")
        .eq("event_id", eventId as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EventReschedule | null;
    },
  });
}

function useRescheduleChoice(ticketId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["ticket-reschedule-choice", ticketId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("ticket_reschedule_choices")
        .select("*")
        .eq("ticket_id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as RescheduleChoiceRow | null;
    },
  });
}

function TicketDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: ticket, isLoading, isError } = useTicketDetail(id, user?.id);
  const [confirmRefundOpen, setConfirmRefundOpen] = useState(false);

  const eventForHooks = ticket?.events ?? null;
  const isRescheduled = (eventForHooks?.reschedule_count ?? 0) >= 1;
  const hasNotStarted = eventForHooks?.starts_at
    ? new Date(eventForHooks.starts_at).getTime() >= Date.now()
    : false;
  const showRescheduleBlock = ticket?.status === "valid" && isRescheduled && hasNotStarted;

  const { data: lastReschedule } = useLastReschedule(eventForHooks?.id, showRescheduleBlock);
  const { data: choice } = useRescheduleChoice(id, showRescheduleBlock);

  const chooseMutation = useMutation({
    mutationFn: async (choiceValue: "keep" | "refund") => {
      const { data, error } = await db.rpc("choose_reschedule_option", {
        p_ticket_id: id,
        p_choice: choiceValue,
      });
      if (error) throw error;
      return data as unknown as { choice: string; refund_amount: number };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["ticket-reschedule-choice", id] });
      void queryClient.invalidateQueries({ queryKey: ["my-ticket", id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["my-tickets", user?.id] });
      if (data.choice === "refund") {
        toast.success(
          data.refund_amount > 0
            ? `Reembolso de ${brl(Number(data.refund_amount))} solicitado`
            : "Ingresso cancelado",
        );
      } else {
        toast.success("Você manteve seu ingresso");
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(translateRescheduleError(message));
    },
  });

  if (isLoading) {
    return (
      <PageShell className="max-w-2xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell className="max-w-2xl">
        <p className="rounded-xl bg-secondary p-5 text-sm font-semibold text-destructive">
          Não foi possível carregar este ingresso. Tente novamente em instantes.
        </p>
      </PageShell>
    );
  }

  if (!ticket || !ticket.events) {
    return (
      <PageShell className="max-w-2xl">
        <p className="rounded-xl bg-secondary p-5 text-sm font-semibold">
          Ingresso não encontrado.
        </p>
        <Link to="/meus-ingressos" className="mt-4 inline-block text-sm font-bold text-primary">
          ← Meus ingressos
        </Link>
      </PageShell>
    );
  }

  const event = ticket.events;
  const active = ticket.status === "valid";
  const startsAt = event.starts_at ? new Date(event.starts_at) : null;

  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(`Ingresso Entrô · ${ticket.ticket_types?.name ?? ""}`)}&location=${encodeURIComponent(`${event.venue_name ?? ""}, ${event.city ?? ""}`)}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue_name ?? ""} ${event.street ?? ""} ${event.city ?? ""}`)}`;

  const transferDisabledReason = !event.allow_transfer
    ? "O produtor deste evento não permite transferência de ingressos."
    : "A transferência de titularidade ainda não está disponível por aqui. Fale com o suporte para transferir seu ingresso.";
  const refundDisabledReason = !event.allow_cancellation
    ? "O produtor deste evento não permite cancelamento/reembolso de ingressos."
    : "A solicitação de reembolso ainda não está disponível por aqui. Fale com o suporte para solicitar reembolso.";

  return (
    <PageShell className="max-w-2xl">
      <Link to="/meus-ingressos" className="text-sm font-bold text-primary">
        ← Meus ingressos
      </Link>
      <h1 className="mt-3 text-4xl font-bold">{event.title}</h1>

      <div className="mt-6 rounded-2xl border-2 border-ink bg-card p-6 text-center shadow-pop">
        <div
          className={`mx-auto w-fit rounded-xl border-2 border-ink bg-background p-4 ${active ? "" : "opacity-40"}`}
        >
          <QRCodeSVG value={ticket.qr_token} size={200} />
        </div>
        <p className="mt-4 font-display text-lg font-extrabold tracking-wide">{ticket.qr_token}</p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-extrabold">
          <WifiOff className="size-3.5" /> Disponível offline
        </span>
        {!active && (
          <p className="mt-3 text-sm font-bold text-cta">
            Ingresso {(statusLabel[ticket.status] ?? ticket.status).toLowerCase()}
          </p>
        )}
      </div>

      <dl className="mt-8 grid gap-3 rounded-xl border border-border p-5 text-sm">
        <Row label="Evento" value={event.title} />
        <Row
          label="Data e horário"
          value={
            startsAt
              ? startsAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
              : "A confirmar"
          }
        />
        <Row
          label="Local"
          value={
            <span className="flex flex-wrap items-center gap-2">
              {event.venue_name}, {event.city}{" "}
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-primary"
              >
                <MapPin className="size-3.5" /> Ver no mapa
              </a>
            </span>
          }
        />
        <Row
          label="Titular"
          value={`${ticket.holder_name}${ticket.holder_cpf ? ` · ${ticket.holder_cpf}` : ""}`}
        />
        <Row
          label="Tipo e lote"
          value={`${ticket.ticket_types?.name ?? "Ingresso"} · ${ticket.lots?.name ?? ""}`}
        />
        <Row label="Valor pago" value={brl(Number(ticket.price))} />
      </dl>

      {ticket.is_half_price && (
        <p className="mt-4 rounded-xl bg-sun/30 p-4 text-sm font-semibold">
          Meia-entrada: leve o documento que comprova o benefício. Sem ele, a entrada pode ser
          recusada na portaria.
        </p>
      )}

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button className="gap-2" disabled title={transferDisabledReason}>
          <Send className="size-4" /> Transferir ingresso
        </Button>
        <Button
          className="gap-2"
          disabled={!active}
          onClick={() => void downloadTicketPdf(ticket, event)}
        >
          <Download className="size-4" /> Baixar PDF
        </Button>
        <Button variant="outline" className="gap-2" disabled title={refundDisabledReason}>
          <RotateCcw className="size-4" /> Solicitar reembolso
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <a href={calendarUrl} target="_blank" rel="noreferrer">
            <CalendarPlus className="size-4" /> Adicionar à agenda
          </a>
        </Button>
      </div>

      {showRescheduleBlock && (
        <div className="mt-6 rounded-xl border border-sun bg-sun/30 p-5 text-sm">
          <p className="font-bold">Data alterada</p>
          <p className="mt-2">
            De{" "}
            <strong>
              {event.previous_starts_at ? shortDateTime(event.previous_starts_at) : "—"}
            </strong>{" "}
            para <strong>{event.starts_at ? shortDateTime(event.starts_at) : "—"}</strong>
          </p>
          {lastReschedule?.reason && (
            <p className="mt-1 text-muted-foreground">Motivo: {lastReschedule.reason}</p>
          )}
          <p className="mt-2 text-muted-foreground">Você pode escolher até o início do evento.</p>

          {choice ? (
            <p className="mt-3 font-semibold">
              {choice.choice === "keep"
                ? "Você manteve seu ingresso"
                : "Você solicitou reembolso para este ingresso"}
            </p>
          ) : (
            <p className="mt-3 text-muted-foreground">
              Se você não escolher, seu ingresso continua válido para a nova data.
            </p>
          )}

          {(!choice || choice.choice === "keep") && (
            <div className="mt-4 flex flex-wrap gap-3">
              {!choice && (
                <Button
                  onClick={() => chooseMutation.mutate("keep")}
                  disabled={chooseMutation.isPending}
                >
                  Manter meu ingresso
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setConfirmRefundOpen(true)}
                disabled={chooseMutation.isPending}
              >
                Quero reembolso
              </Button>
            </div>
          )}

          <AlertDialog open={confirmRefundOpen} onOpenChange={setConfirmRefundOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Solicitar reembolso?</AlertDialogTitle>
                <AlertDialogDescription>
                  Seu ingresso será cancelado e não poderá ser recuperado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setConfirmRefundOpen(false);
                    chooseMutation.mutate("refund");
                  }}
                >
                  Confirmar reembolso
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="mt-6 rounded-xl bg-secondary p-5 text-sm">
        <p className="font-bold">Transferência e reembolso</p>
        <ul className="mt-2 grid gap-1.5 text-muted-foreground">
          <li>{transferDisabledReason}</li>
          <li>{refundDisabledReason}</li>
        </ul>
      </div>
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
