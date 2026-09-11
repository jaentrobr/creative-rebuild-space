import { useSyncExternalStore } from "react";
import { demoTickets, type DemoTicket } from "@/data/account";

type SessionState = { signedIn: boolean; city: string; tickets: DemoTicket[] };

let state: SessionState = { signedIn: false, city: "", tickets: demoTickets };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => state;

export function useSession() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function signIn() {
  state = { ...state, signedIn: true };
  emit();
}

export function signOut() {
  state = { ...state, signedIn: false };
  emit();
}

export function setCity(city: string) {
  state = { ...state, city };
  emit();
}

export function updateTicket(id: string, patch: Partial<DemoTicket>) {
  state = { ...state, tickets: state.tickets.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)) };
  emit();
}
