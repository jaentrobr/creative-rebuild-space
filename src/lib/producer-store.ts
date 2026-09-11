import { useSyncExternalStore } from "react";
import {
  eventParticipants,
  participants as initialParticipants,
  initialCoupons,
  initialCourtesies,
  initialEvents,
  initialGateUsers,
  initialPromoters,
  initialTicketTypes,
  producerProfile,
  refunds as initialRefunds,
  type Coupon,
  type Courtesy,
  type GateUser,
  type Participant,
  type ProducerEvent,
  type ProducerTicketType,
  type Promoter,
  type Refund,
  type VerificationStatus,
} from "@/data/producer";

export type ProducerState = {
  events: ProducerEvent[];
  ticketTypes: Record<string, ProducerTicketType[]>;
  coupons: Coupon[];
  courtesies: Courtesy[];
  promoters: Promoter[];
  gateUsers: GateUser[];
  participants: Participant[];
  verification: VerificationStatus;
  verificationReason: string;
  profile: typeof producerProfile;
  notifications: { sale: boolean; lotSoldOut: boolean; refund: boolean; withdraw: boolean };
  availableBalance: number;
  refunds: Refund[];
  frozenBalance: number;
  cancelledEvents: Record<string, { frozen: number; refunded: number; people: number; at: string }>;
  /** Eventos que já tiveram dinheiro recebido antecipado (adiantamento/antecipação). */
  advancedEvents: Record<string, { amount: number; at: string; kind: "Adiantamento" | "Antecipação" }>;
  /** Controles definidos pela Entrô (painel interno). */
  withdrawBlocked: boolean;
  withdrawBlockReason: string;
  advanceLimit: number;
  /** Aceite dos Termos do produtor (simulado no front). */
  termsAcceptance: { version: string; acceptedAt: string; ip: string } | null;
};

let state: ProducerState = {
  events: initialEvents,
  ticketTypes: initialTicketTypes,
  coupons: initialCoupons,
  courtesies: initialCourtesies,
  promoters: initialPromoters,
  gateUsers: initialGateUsers,
  participants: initialParticipants,
  verification: "Aprovado",
  verificationReason: "",
  profile: producerProfile,
  notifications: { sale: true, lotSoldOut: true, refund: true, withdraw: false },
  availableBalance: 18420.55,
  refunds: initialRefunds,
  frozenBalance: 0,
  cancelledEvents: {},
  advancedEvents: {
    "ev-baile": { amount: 4850.5, at: new Date(Date.now() - 9 * 86400000).toISOString(), kind: "Adiantamento" },
    "ev-fabrica": { amount: 2910.2, at: new Date(Date.now() - 3 * 86400000).toISOString(), kind: "Adiantamento" },
  },
  withdrawBlocked: false,
  withdrawBlockReason: "",
  advanceLimit: 7400,
  termsAcceptance: null,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => state;
const set = (patch: Partial<ProducerState>) => {
  state = { ...state, ...patch };
  emit();
};

export function useProducer() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function getProducerState() {
  return state;
}

export function subscribeProducer(listener: () => void) {
  return subscribe(listener);
}

export const producerActions = {
  setVerification(status: VerificationStatus, reason = "") {
    set({ verification: status, verificationReason: reason });
  },
  updateEvent(id: string, patch: Partial<ProducerEvent>) {
    set({ events: state.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  },
  /** Cancela o evento: congela o dinheiro e estorna todo mundo que pagou. */
  cancelEvent(id: string) {
    const event = state.events.find((e) => e.id === id);
    if (!event || event.status === "Cancelado") return;
    if (state.advancedEvents[id]) return;
    const payers = eventParticipants(id).filter((p) => p.status === "Válido" || p.status === "Utilizado");
    const total = Number(payers.reduce((sum, p) => sum + p.price, 0).toFixed(2));
    const now = new Date().toISOString();
    const newRefunds: Refund[] = payers.map((p) => ({
      id: `rf-${id}-${p.id}`,
      buyer: p.name,
      eventId: id,
      ticket: `${p.type} — ${p.lot}`,
      purchasedAt: p.purchasedAt,
      requestedAt: now,
      reason: "Evento cancelado pelo produtor",
      rule: "Evento cancelado",
      amount: p.price,
      status: "Processando",
    }));
    set({
      events: state.events.map((e) => (e.id === id ? { ...e, status: "Cancelado", salesPaused: true } : e)),
      refunds: [...newRefunds, ...state.refunds],
      frozenBalance: Number((state.frozenBalance + total).toFixed(2)),
      availableBalance: Number((state.availableBalance - total).toFixed(2)),
      cancelledEvents: { ...state.cancelledEvents, [id]: { frozen: total, refunded: total, people: payers.length, at: now } },
    });
  },
  addEvent(event: ProducerEvent, types: ProducerTicketType[]) {
    set({
      events: [event, ...state.events],
      ticketTypes: { ...state.ticketTypes, [event.id]: types },
    });
  },
  duplicateEvent(id: string) {
    const original = state.events.find((e) => e.id === id);
    if (!original) return;
    const copy: ProducerEvent = {
      ...original,
      id: `ev-${Date.now()}`,
      slug: `${original.slug}-copia`,
      name: `${original.name} (cópia)`,
      status: "Rascunho",
    };
    set({
      events: [copy, ...state.events],
      ticketTypes: { ...state.ticketTypes, [copy.id]: state.ticketTypes[original.id] ?? [] },
    });
  },
  addCoupon(coupon: Coupon) {
    set({ coupons: [coupon, ...state.coupons] });
  },
  toggleCoupon(id: string) {
    set({ coupons: state.coupons.map((c) => (c.id === id ? { ...c, active: !c.active } : c)) });
  },
  addCourtesy(courtesy: Courtesy) {
    set({ courtesies: [courtesy, ...state.courtesies] });
  },
  updateCourtesy(id: string, patch: Partial<Courtesy>) {
    set({ courtesies: state.courtesies.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  },
  addPromoter(promoter: Promoter) {
    set({ promoters: [promoter, ...state.promoters] });
  },
  updatePromoter(id: string, patch: Partial<Promoter>) {
    set({ promoters: state.promoters.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  },
  addGateUser(user: GateUser) {
    set({ gateUsers: [user, ...state.gateUsers] });
  },
  updateGateUser(id: string, patch: Partial<GateUser>) {
    set({ gateUsers: state.gateUsers.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  },
  checkInParticipant(participantId: string, gateUserId: string) {
    const participant = state.participants.find((p) => p.id === participantId);
    if (!participant || participant.status !== "Válido") return;
    set({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, status: "Utilizado", checkedIn: true } : p,
      ),
      gateUsers: state.gateUsers.map((g) => (g.id === gateUserId ? { ...g, checkins: g.checkins + 1 } : g)),
    });
  },
  updateProfile(patch: Partial<typeof producerProfile>) {
    set({ profile: { ...state.profile, ...patch } });
  },
  acceptProducerTerms(version: string) {
    set({
      termsAcceptance: {
        version,
        acceptedAt: new Date().toISOString(),
        ip: `189.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      },
    });
  },
  updateNotifications(patch: Partial<ProducerState["notifications"]>) {
    set({ notifications: { ...state.notifications, ...patch } });
  },
  changeBalance(delta: number) {
    set({ availableBalance: Number((state.availableBalance + delta).toFixed(2)) });
  },
  /** Registra dinheiro recebido antes do evento: trava o cancelamento desse evento. */
  registerAdvance(eventId: string, amount: number, kind: "Adiantamento" | "Antecipação") {
    set({
      advancedEvents: { ...state.advancedEvents, [eventId]: { amount: Number(amount.toFixed(2)), at: new Date().toISOString(), kind } },
    });
  },
  setWithdrawBlocked(blocked: boolean, reason = "") {
    set({ withdrawBlocked: blocked, withdrawBlockReason: blocked ? reason : "" });
  },
  setAdvanceLimit(limit: number) {
    set({ advanceLimit: Math.max(0, Number(limit.toFixed(2))) });
  },
};

/** Depois de receber o dinheiro antecipado, o evento não pode mais ser cancelado. */
export function eventCancelBlock(eventId: string) {
  return state.advancedEvents[eventId] ?? null;
}
