import { useSyncExternalStore } from "react";
import type { GateUser, Participant, ProducerEvent } from "@/data/producer";
import { getProducerState, producerActions, subscribeProducer } from "@/lib/producer-store";
import { cancelReasonLabel, fabricateUsedInfo, testCodes, toDisplayTicket, type DisplayTicket } from "@/data/gate";

export type ScanResult =
  | { kind: "granted"; ticket: DisplayTicket; participantId?: string; offline?: boolean }
  | { kind: "granted_check_doc"; ticket: DisplayTicket; participantId?: string; offline?: boolean }
  | { kind: "used"; ticket: DisplayTicket; usedAt: string; gateName: string }
  | { kind: "cancelled"; ticket: DisplayTicket; reason: string }
  | { kind: "not_found"; code: string }
  | { kind: "wrong_event"; code: string; eventName: string }
  | { kind: "refused"; ticket: DisplayTicket };

export type HistoryEntry = {
  id: string;
  at: string;
  result: ScanResult;
  code: string;
  offline?: boolean;
};

type PendingCheckin = { id: string; participantId: string; code: string; name: string; at: string };

type GateState = {
  signedIn: boolean;
  gateUser: GateUser | null;
  downloading: boolean;
  downloadProgress: number;
  downloaded: boolean;
  downloadedAt: string | null;
  downloadedCount: number;
  online: boolean;
  lastSync: string | null;
  pending: PendingCheckin[];
  offlineUsedCodes: Set<string>;
  history: HistoryEntry[];
  conflict: { code: string; entries: { at: string; gate: string }[] } | null;
  loginError: string;
  logoutBlocked: string;
};

let state: GateState = {
  signedIn: false,
  gateUser: null,
  downloading: false,
  downloadProgress: 0,
  downloaded: false,
  downloadedAt: null,
  downloadedCount: 0,
  online: true,
  lastSync: null,
  pending: [],
  offlineUsedCodes: new Set(),
  history: [],
  conflict: null,
  loginError: "",
  logoutBlocked: "",
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;
const set = (patch: Partial<GateState>) => {
  state = { ...state, ...patch };
  emit();
};

export function useGate() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function getGateEvent(): ProducerEvent | null {
  if (!state.gateUser) return null;
  return getProducerState().events.find((e) => e.id === state.gateUser!.eventId) ?? null;
}

export function getEventParticipants(): Participant[] {
  const event = getGateEvent();
  if (!event) return [];
  return getProducerState().participants.filter((p) => p.eventId === event.id);
}

export function getEnteredCounts() {
  const list = getEventParticipants();
  return { entered: list.filter((p) => p.status === "Utilizado").length, total: list.length };
}

const uid = () => Math.random().toString(36).slice(2, 10);

function pushHistory(code: string, result: ScanResult, offline?: boolean) {
  const entry: HistoryEntry = { id: uid(), at: new Date().toISOString(), result, code, offline: offline ?? false };
  set({ history: [entry, ...state.history].slice(0, 200) });
}

function checkInNow(participant: Participant): ScanResult {
  const ticket = toDisplayTicket(participant);
  if (!state.online) {
    set({
      pending: [...state.pending, { id: uid(), participantId: participant.id, code: participant.code, name: participant.name, at: new Date().toISOString() }],
      offlineUsedCodes: new Set(state.offlineUsedCodes).add(participant.code),
    });
    return participant.half
      ? { kind: "granted_check_doc", ticket, participantId: participant.id, offline: true }
      : { kind: "granted", ticket, participantId: participant.id, offline: true };
  }
  producerActions.checkInParticipant(participant.id, state.gateUser!.id);
  return participant.half
    ? { kind: "granted_check_doc", ticket, participantId: participant.id }
    : { kind: "granted", ticket, participantId: participant.id };
}

function classify(code: string): ScanResult {
  const test = testCodes.find((t) => t.code === code);
  if (test) {
    if (test.kind === "granted" || test.kind === "granted_check_doc") return { kind: test.kind, ticket: test.ticket! };
    if (test.kind === "used") return { kind: "used", ticket: test.ticket!, usedAt: test.usedAt!, gateName: test.gateName! };
    if (test.kind === "cancelled") return { kind: "cancelled", ticket: test.ticket!, reason: test.reason! };
    if (test.kind === "not_found") return { kind: "not_found", code };
    return { kind: "wrong_event", code, eventName: test.eventName! };
  }

  if (state.offlineUsedCodes.has(code)) {
    const pending = state.pending.find((p) => p.code === code);
    const st = getProducerState();
    const participant = st.participants.find((p) => p.code === code);
    const ticket = participant ? toDisplayTicket(participant) : { name: pending?.name ?? "—", type: "—", lot: "—", half: false, code };
    return { kind: "used", ticket, usedAt: pending ? new Date(pending.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—", gateName: state.gateUser?.name ?? "—" };
  }

  const event = getGateEvent();
  const st = getProducerState();
  const participant = st.participants.find((p) => p.code === code);
  if (!participant) return { kind: "not_found", code };
  if (!event || participant.eventId !== event.id) {
    const otherEvent = st.events.find((e) => e.id === participant.eventId);
    return { kind: "wrong_event", code, eventName: otherEvent?.name ?? "outro evento" };
  }
  if (participant.status === "Utilizado") {
    const info = fabricateUsedInfo(participant.id);
    return { kind: "used", ticket: toDisplayTicket(participant), usedAt: info.time, gateName: info.gate };
  }
  if (participant.status === "Transferido" || participant.status === "Reembolsado") {
    return { kind: "cancelled", ticket: toDisplayTicket(participant), reason: cancelReasonLabel(participant.status) };
  }
  return checkInNow(participant);
}

export const gateActions = {
  login(username: string, password: string) {
    const user = getProducerState().gateUsers.find((g) => g.username === username.trim() && g.password === password && g.active);
    if (!user) {
      set({ loginError: "Usuário ou senha inválidos." });
      return false;
    }
    set({ signedIn: true, gateUser: user, loginError: "" });
    return true;
  },
  logout() {
    if (state.pending.length > 0) {
      set({ logoutBlocked: `Você tem ${state.pending.length} check-ins não enviados. Conecte-se à internet antes de sair.` });
      return false;
    }
    set({
      signedIn: false,
      gateUser: null,
      downloaded: false,
      downloadedAt: null,
      downloadProgress: 0,
      history: [],
      pending: [],
      offlineUsedCodes: new Set(),
      logoutBlocked: "",
    });
    return true;
  },
  dismissLogoutBlocked() {
    set({ logoutBlocked: "" });
  },
  downloadList() {
    const list = getEventParticipants();
    set({ downloading: true, downloadProgress: 0 });
    let progress = 0;
    const step = () => {
      progress = Math.min(100, progress + 20 + Math.random() * 20);
      set({ downloadProgress: progress });
      if (progress >= 100) {
        set({
          downloading: false,
          downloaded: true,
          downloadedAt: new Date().toISOString(),
          downloadedCount: list.length,
        });
      } else {
        setTimeout(step, 180);
      }
    };
    setTimeout(step, 180);
  },
  setOnline(online: boolean) {
    set({ online });
    if (online && state.pending.length > 0) {
      return gateActions.syncPending();
    }
    return 0;
  },
  syncPending() {
    const count = state.pending.length;
    if (count === 0) return 0;
    for (const p of state.pending) {
      producerActions.checkInParticipant(p.participantId, state.gateUser!.id);
    }
    set({ pending: [], lastSync: new Date().toISOString() });
    return count;
  },
  scanCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const result = classify(trimmed);
    pushHistory(trimmed, result, "offline" in result ? result.offline : undefined);
    return result;
  },
  manualCheckin(participantId: string) {
    const st = getProducerState();
    const participant = st.participants.find((p) => p.id === participantId);
    if (!participant || participant.status !== "Válido") return null;
    const result = checkInNow(participant);
    pushHistory(participant.code, result, "offline" in result ? result.offline : undefined);
    return result;
  },
  refuse(ticket: DisplayTicket) {
    pushHistory(ticket.code, { kind: "refused", ticket });
  },
  simulateConflict() {
    const list = getEventParticipants().filter((p) => p.status === "Utilizado");
    const participant = list[0] ?? getEventParticipants()[0];
    if (!participant) return;
    set({
      conflict: {
        code: participant.code,
        entries: [
          { at: "22:41", gate: "Portaria A" },
          { at: "22:41", gate: "Portaria B" },
        ],
      },
    });
  },
  dismissConflict() {
    set({ conflict: null });
  },
};

subscribeProducer(() => emit());
