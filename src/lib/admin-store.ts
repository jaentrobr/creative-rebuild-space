import { useSyncExternalStore } from "react";
import {
  chargebacks as initialChargebacks,
  defaultFees,
  events as initialEvents,
  initialActionLog,
  initialAdminTeam,
  producers as initialProducers,
  orders as initialOrders,
  type AdminChargeback,
  type AdminEvent,
  type AdminOrder,
  type AdminProducer,
  type AdminRole,
  type AdminUser,
  type ActionLogEntry,
  type FeeSettings,
} from "@/data/admin";
import { producerActions } from "@/lib/producer-store";

export type ProducerOverride = {
  pixFee: number;
  cardFee: number;
  advanceFee: number;
  anticipationMargin: number;
  advanceLimit: number;
  withdrawBlocked: boolean;
  withdrawBlockReason: string;
};

export const defaultOverride: ProducerOverride = {
  pixFee: defaultFees.pixFee,
  cardFee: defaultFees.cardFee,
  advanceFee: defaultFees.advanceFee,
  anticipationMargin: defaultFees.anticipationMargin,
  advanceLimit: 7400,
  withdrawBlocked: false,
  withdrawBlockReason: "",
};

export type AdminState = {
  signedIn: boolean;
  producerOverrides: Record<string, ProducerOverride>;
  producers: AdminProducer[];
  events: AdminEvent[];
  orders: AdminOrder[];
  chargebacks: AdminChargeback[];
  fees: FeeSettings;
  team: AdminUser[];
  actionLog: ActionLogEntry[];
};

let state: AdminState = {
  signedIn: false,
  producerOverrides: {},
  producers: initialProducers,
  events: initialEvents,
  orders: initialOrders,
  chargebacks: initialChargebacks,
  fees: defaultFees,
  team: initialAdminTeam,
  actionLog: initialActionLog,
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
const set = (patch: Partial<AdminState>) => {
  state = { ...state, ...patch };
  emit();
};

export function useAdmin() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

const currentAdminName = () => "Fernanda Cardoso";

const log = (action: string, kind: ActionLogEntry["kind"]) => {
  const entry: ActionLogEntry = { id: `log-${Date.now()}`, who: currentAdminName(), action, kind, at: new Date().toISOString() };
  set({ actionLog: [entry, ...state.actionLog] });
};

export const adminActions = {
  signIn() {
    set({ signedIn: true });
  },
  signOut() {
    set({ signedIn: false });
  },
  blockProducer(id: string, reason: string) {
    const producer = state.producers.find((p) => p.id === id);
    set({ producers: state.producers.map((p) => (p.id === id ? { ...p, blocked: true, blockReason: reason } : p)) });
    if (producer) log(`Bloqueou o produtor ${producer.name}: ${reason}`, "Bloqueio");
  },
  unblockProducer(id: string) {
    const producer = state.producers.find((p) => p.id === id);
    set({ producers: state.producers.map((p) => (p.id === id ? { ...p, blocked: false, blockReason: "" } : p)) });
    if (producer) log(`Desbloqueou o produtor ${producer.name}`, "Bloqueio");
  },
  markRisk(id: string, risk: boolean) {
    const producer = state.producers.find((p) => p.id === id);
    set({ producers: state.producers.map((p) => (p.id === id ? { ...p, risk } : p)) });
    if (producer) log(`${risk ? "Marcou" : "Desmarcou"} ${producer.name} como risco`, "Outro");
  },
  suspendEvent(id: string, reason: string) {
    const ev = state.events.find((e) => e.id === id);
    set({ events: state.events.map((e) => (e.id === id ? { ...e, status: "Suspenso", suspendReason: reason } : e)) });
    if (ev) log(`Suspendeu o evento ${ev.name}: ${reason}`, "Suspensão");
  },
  unsuspendEvent(id: string) {
    const ev = state.events.find((e) => e.id === id);
    set({ events: state.events.map((e) => (e.id === id ? { ...e, status: "Publicado", suspendReason: "" } : e)) });
    if (ev) log(`Reativou o evento ${ev.name}`, "Suspensão");
  },
  toggleFeatured(id: string) {
    set({ events: state.events.map((e) => (e.id === id ? { ...e, featured: !e.featured } : e)) });
  },
  refundOrder(id: string, reason: string) {
    const order = state.orders.find((o) => o.id === id);
    set({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, status: "Reembolsado", history: [...o.history, { at: new Date().toISOString(), label: `Estorno manual: ${reason}` }] } : o,
      ),
    });
    if (order) log(`Estornou o pedido ${order.number}: ${reason}`, "Estorno");
  },
  resendTickets(id: string) {
    const order = state.orders.find((o) => o.id === id);
    if (order) log(`Reenviou os ingressos do pedido ${order.number} por e-mail`, "Outro");
  },
  updateFees(patch: Partial<FeeSettings>) {
    set({ fees: { ...state.fees, ...patch } });
    log(`Alterou taxas: ${Object.keys(patch).join(", ")}`, "Taxa");
  },
  sendDefense(id: string) {
    const cb = state.chargebacks.find((c) => c.id === id);
    set({
      chargebacks: state.chargebacks.map((c) =>
        c.id === id ? { ...c, status: "Em defesa", defense: { ...c.defense, sentAt: new Date().toISOString() } } : c,
      ),
    });
    if (cb) log(`Enviou defesa do chargeback do pedido ${cb.orderId}`, "Outro");
  },
  inviteAdmin(name: string, email: string, role: AdminRole) {
    const user: AdminUser = { id: `adm-${Date.now()}`, name, email, role };
    set({ team: [...state.team, user] });
    log(`Convidou ${name} como ${role}`, "Permissão");
  },
  setProducerOverride(id: string, patch: Partial<ProducerOverride>) {
    const current = state.producerOverrides[id] ?? defaultOverride;
    const next = { ...current, ...patch };
    set({ producerOverrides: { ...state.producerOverrides, [id]: next } });
    const producer = state.producers.find((p) => p.id === id);
    if (producer) {
      if (patch.withdrawBlocked !== undefined) {
        log(`${patch.withdrawBlocked ? "Travou" : "Liberou"} os saques de ${producer.name}`, "Permissão");
      }
      const feeKeys = Object.keys(patch).filter((k) => k !== "withdrawBlocked" && k !== "withdrawBlockReason");
      if (feeKeys.length > 0) log(`Alterou taxas/limites de ${producer.name}: ${feeKeys.join(", ")}`, "Taxa");
    }
    if (id === "prod-altofalante") {
      if (patch.withdrawBlocked !== undefined) producerActions.setWithdrawBlocked(next.withdrawBlocked, next.withdrawBlockReason);
      if (patch.advanceLimit !== undefined) producerActions.setAdvanceLimit(next.advanceLimit);
    }
  },
  removeAdmin(id: string) {
    const user = state.team.find((u) => u.id === id);
    set({ team: state.team.filter((u) => u.id !== id) });
    if (user) log(`Removeu o acesso de ${user.name}`, "Permissão");
  },
};
