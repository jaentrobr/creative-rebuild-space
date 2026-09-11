import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { shortDateTime } from "@/lib/format";
import { useUpdateEvent } from "@/lib/producer-queries";
import {
  fromDatetimeLocal,
  rescheduleDeadline,
  toDatetimeLocal,
  translateRescheduleError,
} from "@/lib/reschedule";

type EventRow = Tables<"events">;
type LotRow = Tables<"lots">;

export function RescheduleDialog({
  open,
  onOpenChange,
  event,
  lots = [],
  producerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventRow;
  lots?: LotRow[];
  producerId: string | undefined;
}) {
  const updateEvent = useUpdateEvent(event.id, producerId);
  const deadline = rescheduleDeadline(event);
  const now = new Date();

  const [startsAt, setStartsAt] = useState(toDatetimeLocal(event.starts_at));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(event.ends_at));
  const [doorsOpenAt, setDoorsOpenAt] = useState(toDatetimeLocal(event.doors_open_at));
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const minValue = toDatetimeLocal(now.toISOString());
  const maxValue = deadline ? toDatetimeLocal(deadline.toISOString()) : undefined;

  const reasonValid = reason.trim().length >= 10;
  const lotsAfterNewDate = startsAt
    ? lots.filter(
        (lot) =>
          lot.sales_end_at &&
          new Date(lot.sales_end_at) > new Date(fromDatetimeLocal(startsAt) ?? ""),
      )
    : [];

  const canSubmit = reasonValid && confirmed && !!startsAt && !updateEvent.isPending;

  const reset = () => {
    setStartsAt(toDatetimeLocal(event.starts_at));
    setEndsAt(toDatetimeLocal(event.ends_at));
    setDoorsOpenAt(toDatetimeLocal(event.doors_open_at));
    setReason("");
    setConfirmed(false);
  };

  const submit = () => {
    if (!canSubmit) return;
    updateEvent.mutate(
      {
        starts_at: fromDatetimeLocal(startsAt),
        ends_at: fromDatetimeLocal(endsAt),
        doors_open_at: fromDatetimeLocal(doorsOpenAt),
        reschedule_reason: reason.trim(),
      },
      {
        onSuccess: async () => {
          reset();
          onOpenChange(false);
          try {
            const { error } = await db.functions.invoke("notify-event-reschedule", {
              body: { event_id: event.id },
            });
            if (error) throw error;
            toast.success("Data alterada e compradores avisados");
          } catch {
            toast.warning(
              "Data alterada, mas não conseguimos avisar os compradores por e-mail agora.",
            );
          }
        },
        onError: (error) => toast.error(translateRescheduleError(error)),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Alterar data do evento</DialogTitle>
          <DialogDescription>
            Esta é a única alteração de data permitida depois da primeira venda.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-500 bg-amber-500/10 text-ink">
          <AlertTriangle className="size-4" />
          <AlertTitle>Regras da alteração</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
              <li>Depois da primeira venda, a data só pode ser alterada 1 vez.</li>
              <li>
                A nova data deve ser até {deadline ? shortDateTime(deadline.toISOString()) : "—"}.
              </li>
              <li>
                Os compradores serão avisados por e-mail e poderão pedir reembolso integral até o
                início do evento. O reembolso sai do seu saldo.
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div>
            <Label htmlFor="reschedule-start">Nova data e hora de início</Label>
            <input
              id="reschedule-start"
              type="datetime-local"
              className="mt-1 flex h-10 w-full rounded-md border-2 border-foreground bg-background px-3 text-sm"
              value={startsAt}
              min={minValue}
              max={maxValue}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reschedule-end">Novo término</Label>
            <input
              id="reschedule-end"
              type="datetime-local"
              className="mt-1 flex h-10 w-full rounded-md border-2 border-foreground bg-background px-3 text-sm"
              value={endsAt}
              min={minValue}
              max={maxValue}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reschedule-doors">Nova abertura dos portões</Label>
            <input
              id="reschedule-doors"
              type="datetime-local"
              className="mt-1 flex h-10 w-full rounded-md border-2 border-foreground bg-background px-3 text-sm"
              value={doorsOpenAt}
              min={minValue}
              max={maxValue}
              onChange={(e) => setDoorsOpenAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reschedule-reason">Motivo da alteração</Label>
            <Textarea
              id="reschedule-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique o motivo — este texto será exibido aos compradores."
              rows={3}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Mínimo 10 caracteres. Este texto será exibido aos compradores.
            </p>
          </div>

          {lotsAfterNewDate.length > 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Ajuste os lotes</AlertTitle>
              <AlertDescription>
                {lotsAfterNewDate.length} lote(s) têm o fim das vendas depois da nova data de
                início. Considere ajustar o fim das vendas desses lotes.
              </AlertDescription>
            </Alert>
          ) : null}

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            <span>Entendo que não poderei alterar a data novamente.</span>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {updateEvent.isPending ? "Salvando..." : "Confirmar nova data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
