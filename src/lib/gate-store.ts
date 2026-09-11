import { useSyncExternalStore } from "react";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { normalizeCheckinResponse, normalizeParticipants, type DisplayTicket } from "@/data/gate";

export type ScanResult =
  | { kind: "granted"; ticket: DisplayTicket; offline?: boolean }
  | { kind: "granted_check_doc"; ticket: DisplayTicket; offline?: boolean }
  | { kind: "already_used"; ticket?: DisplayTicket | undefined; usedAt?: string | null | undefined }
  | { kind: "canceled"; ticket?: DisplayTicket | undefined }
  | { kind: "not_found"; code: string }
  | { kind: "other_event"; code: string; eventName?: string | null | undefined };

export type HistoryEntry = {
  id: string;
  at: string;
  kind: ScanResult["kind"];
  label: string;
  offline: boolean;
};

export type StaffEvent = { eventId: string; eventTitle: string; displayName: string };

type PendingCheckin = { localId: string; qrToken: string; scannedAt: string; deviceId: string };

type GateState = {
  loading: boolean;
  signedIn: boolean;
  staffEvents: StaffEvent[];
  selectedEventId: string | null;
  downloading: boolean;
  downloadProgress: number;
  downloaded: boolean;
  downloadedAt: string | null;
  participants: DisplayTicket[];
  online: boolean;
  lastSync: string | null;
  pending: PendingCheckin[];
  loginError: string;
  logoutBlocked: string;
  history: HistoryEntry[];
};

let state: GateState = {
  loading: true,
  signedIn: false,
  staffEvents: [],
  selectedEventId: null,
  downloading: false,
  downloadProgress: 0,
  downloaded: false,
  downloadedAt: null,
  participants: [],
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  lastSync: null,
  pending: [],
  loginError: "",
  logoutBlocked: "",
  history: [],
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

/** Identificador estável deste aparelho, guardado localmente (não é dado simulado do backend). */
function deviceId() {
  if (typeof window === "undefined") return "server";
  const key = "entro-portaria-device-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

// ---- IndexedDB: fila offline de check-ins e cache da lista baixada ----
const DB_NAME = "entro-portaria";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains("pending")) idb.createObjectStore("pending", { keyPath: "localId" });
      if (!idb.objectStoreNames.contains("participants")) idb.createObjectStore("participants", { keyPath: "qrToken" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(store: string): Promise<T[]> {
  if (typeof indexedDB === "undefined") return [];
  const idb = await openDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(store: string, value: unknown): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const idb = await openDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(store: string, key: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const idb = await openDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear(store: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const idb = await openDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function classifyLocally(qrToken: string): ScanResult {
  const participant = state.participants.find((p) => p.qrToken === qrToken);
  if (!participant) return { kind: "not_found", code: qrToken };
  if (participant.status !== "valid") {
    if (participant.status === "used") return { kind: "already_used", ticket: participant };
    return { kind: "canceled", ticket: participant };
  }
  return participant.half ? { kind: "granted_check_doc", ticket: participant, offline: true } : { kind: "granted", ticket: participant, offline: true };
}

function recordHistory(result: ScanResult, offline: boolean) {
  const label = "ticket" in result && result.ticket ? result.ticket.name : "code" in result ? result.code : "Ingresso";
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    kind: result.kind,
    label,
    offline,
  };
  set({ history: [entry, ...state.history].slice(0, 200) });
}

export const gateActions = {
  async init() {
    const { data } = await db.auth.getSession();
    if (data.session?.user) {
      await gateActions.loadStaffEvents(data.session.user.id);
    }
    const pending = await idbGetAll<PendingCheckin>("pending");
    const participants = await idbGetAll<DisplayTicket>("participants");
    set({ loading: false, signedIn: !!data.session?.user, pending, participants, downloaded: participants.length > 0 });
  },

  async loadStaffEvents(userId: string) {
    const { data: staffRows, error } = await db
      .from("event_staff")
      .select("event_id, display_name, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (error || !staffRows?.length) {
      set({ staffEvents: [], signedIn: !!staffRows });
      return;
    }
    const eventIds = staffRows.map((r) => r.event_id);
    const { data: eventRows } = await db.from("events").select("id, title").in("id", eventIds);
    const staffEvents: StaffEvent[] = staffRows.map((r) => ({
      eventId: r.event_id,
      eventTitle: eventRows?.find((e) => e.id === r.event_id)?.title ?? "Evento",
      displayName: r.display_name,
    }));
    set({ signedIn: true, staffEvents, selectedEventId: staffEvents[0]?.eventId ?? null });
  },

  async login(email: string, password: string) {
    set({ loginError: "" });
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      set({ loginError: "E-mail ou senha inválidos." });
      return false;
    }
    await gateActions.loadStaffEvents(data.user.id);
    if (state.staffEvents.length === 0) {
      set({ loginError: "Esta conta não é equipe de portaria de nenhum evento ativo." });
      await db.auth.signOut();
      set({ signedIn: false });
      return false;
    }
    return true;
  },

  async logout() {
    if (state.pending.length > 0) {
      set({ logoutBlocked: `Você tem ${state.pending.length} check-ins não enviados. Conecte-se à internet antes de sair.` });
      return false;
    }
    await db.auth.signOut();
    await idbClear("participants");
    set({
      signedIn: false,
      staffEvents: [],
      selectedEventId: null,
      downloaded: false,
      downloadedAt: null,
      downloadProgress: 0,
      participants: [],
      logoutBlocked: "",
    });
    return true;
  },

  dismissLogoutBlocked() {
    set({ logoutBlocked: "" });
  },

  selectEvent(eventId: string) {
    set({ selectedEventId: eventId, downloaded: false, downloadedAt: null, participants: [] });
  },

  async downloadList() {
    if (!state.selectedEventId) return;
    set({ downloading: true, downloadProgress: 30 });
    const { data, error } = await db.rpc("get_checkin_list", { p_event_id: state.selectedEventId });
    if (error) {
      set({ downloading: false, downloadProgress: 0 });
      return;
    }
    const participants = normalizeParticipants(data);
    await idbClear("participants");
    for (const p of participants) await idbPut("participants", p);
    set({
      downloading: false,
      downloadProgress: 100,
      downloaded: true,
      downloadedAt: new Date().toISOString(),
      participants,
    });
  },

  setOnline(online: boolean) {
    set({ online });
    if (online) void gateActions.syncPending();
  },

  async syncPending() {
    const items = [...state.pending];
    if (items.length === 0) return 0;
    let synced = 0;
    for (const item of items) {
      const { data, error } = await db.rpc("checkin_ticket", {
        p_event_id: state.selectedEventId!,
        p_qr_token: item.qrToken,
        p_scanned_at: item.scannedAt,
        p_device_id: item.deviceId,
        p_was_offline: true,
      });
      if (!error) {
        await idbDelete("pending", item.localId);
        set({ pending: state.pending.filter((p) => p.localId !== item.localId) });
        synced += 1;
        void data;
      }
    }
    set({ lastSync: new Date().toISOString() });
    return synced;
  },

  async scanCode(qrToken: string): Promise<ScanResult | null> {
    const code = qrToken.trim();
    if (!code || !state.selectedEventId) return null;

    if (!state.online) {
      const result = classifyLocally(code);
      if (result.kind === "granted" || result.kind === "granted_check_doc") {
        const item: PendingCheckin = { localId: crypto.randomUUID(), qrToken: code, scannedAt: new Date().toISOString(), deviceId: deviceId() };
        await idbPut("pending", item);
        const participants = state.participants.map((p) => (p.qrToken === code ? { ...p, status: "used" } : p));
        await idbPut("participants", participants.find((p) => p.qrToken === code));
        set({ pending: [...state.pending, item], participants });
      }
      recordHistory(result, true);
      return result;
    }

    const { data, error } = await db.rpc("checkin_ticket", {
      p_event_id: state.selectedEventId,
      p_qr_token: code,
      p_scanned_at: new Date().toISOString(),
      p_device_id: deviceId(),
      p_was_offline: false,
    });
    if (error) {
      const notFound: ScanResult = { kind: "not_found", code };
      recordHistory(notFound, false);
      return notFound;
    }
    const normalized = normalizeCheckinResponse(data);
    if (normalized.result === "ok") {
      const ticket = normalized.ticket;
      const participants = state.participants.map((p) => (p.qrToken === code ? { ...p, status: "used" } : p));
      set({ participants });
      const granted: ScanResult = ticket?.half
        ? { kind: "granted_check_doc", ticket }
        : { kind: "granted", ticket: ticket! };
      recordHistory(granted, false);
      return granted;
    }
    let out: ScanResult;
    if (normalized.result === "already_used") out = { kind: "already_used", ticket: normalized.ticket, usedAt: normalized.usedAt };
    else if (normalized.result === "canceled") out = { kind: "canceled", ticket: normalized.ticket };
    else if (normalized.result === "other_event") out = { kind: "other_event", code, eventName: normalized.otherEventName };
    else out = { kind: "not_found", code };
    recordHistory(out, false);
    return out;
  },
};

export function getParticipants(): DisplayTicket[] {
  return state.participants;
}

export function getGateEvent(): StaffEvent | null {
  return state.staffEvents.find((e) => e.eventId === state.selectedEventId) ?? null;
}

export function getEnteredCounts() {
  const total = state.participants.length;
  const entered = state.participants.filter((p) => p.status === "used").length;
  return { entered, total };
}
