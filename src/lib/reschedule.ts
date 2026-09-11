/** Traduções de erros do banco relacionados à alteração de data e cálculo da data limite de reagendamento. */

const RESCHEDULE_ERROR_MESSAGES: Record<string, string> = {
  reschedule_not_allowed_status: "Não é possível alterar a data de um evento encerrado, cancelado ou suspenso",
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

/** Traduz mensagens de erro do banco para textos em pt-BR amigáveis ao produtor. */
export function translateRescheduleError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const key = Object.keys(RESCHEDULE_ERROR_MESSAGES).find((code) => raw.includes(code));
  if (key) return RESCHEDULE_ERROR_MESSAGES[key] ?? raw;
  return raw || "Não foi possível alterar a data do evento.";
}

/** Data prevista do evento (original_starts_at, se existir, senão a data atual de início). */
export function rescheduleBaseDate(event: { starts_at: string | null; original_starts_at: string | null }): Date | null {
  const base = event.original_starts_at ?? event.starts_at;
  return base ? new Date(base) : null;
}

/** Prazo máximo (90 dias após a data prevista) para a nova data de início. */
export function rescheduleDeadline(event: { starts_at: string | null; original_starts_at: string | null }): Date | null {
  const base = rescheduleBaseDate(event);
  if (!base) return null;
  const deadline = new Date(base);
  deadline.setDate(deadline.getDate() + 90);
  return deadline;
}

/** Converte um ISO string para o formato aceito por <input type="datetime-local">. */
export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converte o valor de <input type="datetime-local"> para ISO string, ou null se vazio. */
export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
