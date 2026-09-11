import type { Enums } from "@/integrations/meu-supabase/types";

/**
 * As RPCs `get_checkin_list`, `get_event_participants` e `checkin_ticket` retornam `Json`
 * (o schema não descreve o formato exato dos campos). As funções abaixo normalizam esse
 * retorno de forma defensiva, aceitando algumas variações plausíveis de nome de campo,
 * para reduzir o risco de quebra caso os nomes reais sejam ligeiramente diferentes.
 */

export type CheckinResult = Enums<"checkin_result">;

export type DisplayTicket = {
  id: string;
  name: string;
  document: string | null;
  type: string;
  lot: string;
  half: boolean;
  qrToken: string;
  status: string;
};

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

export function normalizeParticipant(raw: unknown): DisplayTicket | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = pick(o, ["ticket_id", "id"]);
  const qrToken = pick(o, ["qr_token", "qrToken", "code"]);
  if (typeof id !== "string" || typeof qrToken !== "string") return null;
  return {
    id,
    name: String(pick(o, ["holder_name", "name"]) ?? "—"),
    document: (pick(o, ["holder_cpf", "document", "cpf"]) as string | undefined) ?? null,
    type: String(pick(o, ["ticket_type_name", "ticket_type", "type"]) ?? "—"),
    lot: String(pick(o, ["lot_name", "lot"]) ?? "—"),
    half: Boolean(pick(o, ["is_half_price", "half_price", "half"])),
    qrToken,
    status: String(pick(o, ["status", "ticket_status"]) ?? "valid"),
  };
}

export function normalizeParticipants(raw: unknown): DisplayTicket[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeParticipant).filter((p): p is DisplayTicket => p !== null);
}

export type CheckinResponse = {
  result: CheckinResult;
  ticket?: DisplayTicket | undefined;
  usedAt?: string | null | undefined;
  otherEventName?: string | null | undefined;
};

export function normalizeCheckinResponse(raw: unknown): CheckinResponse {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = (pick(o, ["result", "status"]) as CheckinResult | undefined) ?? "not_found";
  const ticketRaw = pick(o, ["ticket", "data"]) ?? o;
  const ticket = normalizeParticipant(ticketRaw) ?? undefined;
  return {
    result,
    ticket,
    usedAt: (pick(o, ["used_at", "usedAt", "scanned_at"]) as string | undefined) ?? null,
    otherEventName: (pick(o, ["event_title", "other_event_name", "eventName"]) as string | undefined) ?? null,
  };
}

export const cancelReasonLabel = (status: string) => {
  if (status === "transferred") return "Transferido";
  if (status === "refunded") return "Reembolsado";
  if (status === "canceled") return "Cancelado";
  return "Cancelado";
};
