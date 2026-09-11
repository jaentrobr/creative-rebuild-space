import type { Participant } from "@/data/producer";

/** Representação simplificada de um ingresso para exibição na portaria. */
export type DisplayTicket = { name: string; type: string; lot: string; half: boolean; code: string };

export const toDisplayTicket = (p: Participant): DisplayTicket => ({
  name: p.name,
  type: p.type,
  lot: p.lot,
  half: p.half,
  code: p.code,
});

export type GateOutcomeKind =
  | "granted"
  | "granted_check_doc"
  | "used"
  | "cancelled"
  | "not_found"
  | "wrong_event";

export type TestCodeDef = {
  code: string;
  label: string;
  kind: GateOutcomeKind;
  ticket?: DisplayTicket;
  usedAt?: string;
  gateName?: string;
  reason?: string;
  eventName?: string;
};

/** Códigos fixos para simular cada resultado possível sem precisar de câmera. */
export const testCodes: TestCodeDef[] = [
  {
    code: "TESTE-LIBERADO",
    label: "Liberado (inteira)",
    kind: "granted",
    ticket: { name: "Fulano de Teste", type: "Pista", lot: "2º lote", half: false, code: "TESTE-LIBERADO" },
  },
  {
    code: "TESTE-MEIA",
    label: "Liberado — conferir documento (meia)",
    kind: "granted_check_doc",
    ticket: { name: "Ciclana de Teste", type: "Pista", lot: "1º lote", half: true, code: "TESTE-MEIA" },
  },
  {
    code: "TESTE-USADO",
    label: "Já utilizado",
    kind: "used",
    ticket: { name: "Beltrano de Teste", type: "VIP", lot: "1º lote", half: false, code: "TESTE-USADO" },
    usedAt: "22:14",
    gateName: "Portaria A",
  },
  {
    code: "TESTE-CANCELADO",
    label: "Ingresso cancelado",
    kind: "cancelled",
    ticket: { name: "Sicrana de Teste", type: "Pista", lot: "Lote final", half: false, code: "TESTE-CANCELADO" },
    reason: "Reembolsado",
  },
  {
    code: "TESTE-NAOENCONTRADO",
    label: "Ingresso não encontrado",
    kind: "not_found",
  },
  {
    code: "TESTE-OUTROEVENTO",
    label: "Ingresso de outro evento",
    kind: "wrong_event",
    eventName: "Fábrica de Bass",
  },
];

export const cancelReasonLabel = (status: string) => {
  if (status === "Transferido") return "Transferido";
  if (status === "Reembolsado") return "Reembolsado";
  return "Cancelado";
};

const usedGates = ["Portaria A", "Portaria B"];

/** Gera de forma determinística um horário e portão fictícios para ingressos já usados. */
export const fabricateUsedInfo = (participantId: string) => {
  let h = 0;
  for (const c of participantId) h = (h * 31 + c.charCodeAt(0)) % 997;
  const hour = 20 + (h % 4);
  const minute = h % 60;
  const gate = usedGates[h % usedGates.length]!;
  return {
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    gate,
  };
};
