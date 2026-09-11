export const RESCHEDULE_ERROR_MESSAGES: Record<string, string> = {
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

export function translateRescheduleError(message: string | undefined | null): string {
  if (!message) return "Ocorreu um erro. Tente novamente.";
  const key = Object.keys(RESCHEDULE_ERROR_MESSAGES).find((k) => message.includes(k));
  return key ? RESCHEDULE_ERROR_MESSAGES[key] : message;
}
