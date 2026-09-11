// Helpers reais para o painel admin: nada de estado local fingindo backend.
// Toda leitura/gravação passa pelo `db` (Supabase) — ver regras em /tmp/shared_ctx.md.
import { db } from "@/integrations/meu-supabase/client";
import type { Enums } from "@/integrations/meu-supabase/types";

export type AppRole = Enums<"app_role">;

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Dono",
  finance: "Financeiro",
  support: "Suporte",
  producer: "Produtor",
  staff: "Equipe do evento",
};

export const VERIFICATION_LABELS: Record<Enums<"verification_status">, string> = {
  not_started: "Não iniciado",
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
};

export const EVENT_STATUS_LABELS: Record<Enums<"event_status">, string> = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Pausado",
  ended: "Encerrado",
  canceled: "Cancelado",
  suspended: "Suspenso",
};

export const ORDER_STATUS_LABELS: Record<Enums<"order_status">, string> = {
  pending: "Pendente",
  paid: "Pago",
  expired: "Expirado",
  canceled: "Cancelado",
  refunded: "Reembolsado",
  partially_refunded: "Parc. reembolsado",
};

export const CHARGEBACK_STATUS_LABELS: Record<Enums<"chargeback_status">, string> = {
  open: "Aberto",
  in_defense: "Em defesa",
  won: "Ganho",
  lost: "Perdido",
};

export const PROCESS_STATUS_LABELS: Record<Enums<"process_status">, string> = {
  requested: "Solicitado",
  processing: "Processando",
  done: "Concluído",
  failed: "Falhou",
  rejected: "Recusado",
};

export const PAYMENT_METHOD_LABELS: Record<Enums<"payment_method">, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  free: "Gratuito",
  courtesy: "Cortesia",
};

/** Grava uma linha em audit_logs. Nunca falha silenciosamente: propaga erro para o chamador tratar. */
export async function logAudit(params: {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const { error } = await db.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    details: (params.details ?? {}) as never,
  });
  if (error) throw error;
}
