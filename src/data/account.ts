import type { Tables } from "@/integrations/meu-supabase/types";

export type OrderRow = Tables<"orders">;
export type TicketRow = Tables<"tickets">;
export type EventRow = Tables<"events">;

export type RefundPolicy = { kind: "full" | "partial" | "none"; text: string };

/**
 * Não existe RPC/coluna de reembolso self-service no schema (apenas a tabela `refunds`,
 * sem endpoint exposto para o comprador solicitar). Por isso o reembolso fica sempre
 * desabilitado, com aviso, em vez de simular uma política de acordo com regras de negócio
 * que não podem ser executadas de fato.
 */
export function refundPolicy(): RefundPolicy {
  return {
    kind: "none",
    text: "O reembolso ainda não está disponível por aqui. Fale com o produtor do evento para solicitar.",
  };
}
