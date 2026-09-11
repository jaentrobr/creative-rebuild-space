import { useSyncExternalStore } from "react";
import { db } from "@/integrations/meu-supabase/client";
import { demoTickets, type DemoTicket } from "@/data/account";

/**
 * ATENÇÃO (auth real): este store deixou de ser a fonte de verdade para
 * autenticação. Login/logout reais agora vivem em `@/lib/auth` (useAuth) e em
 * @/components/require-auth. Aqui mantemos apenas `signedIn` sincronizado com
 * a sessão real do Supabase (somente leitura) para não quebrar telas fora do
 * escopo desta tarefa (ex.: producer-cta, produtores, evento.$slug) que ainda
 * leem `useSession().signedIn` — o ideal é migrá-las para `useAuth()`.
 *
 * `tickets`/`updateTicket` continuam com dados de demonstração e precisam ser
 * migrados para dados reais (`tickets`/`orders`) por quem for responsável
 * pelas telas de meus-ingressos/meus-pedidos — fora do escopo desta tarefa.
 *
 * `city` é apenas o filtro de cidade usado pela busca de eventos, não é dado
 * de autenticação — foi mantido como estava.
 */
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

void db.auth.getSession().then(({ data }) => {
  state = { ...state, signedIn: !!data.session };
  emit();
});
db.auth.onAuthStateChange((_event, nextSession) => {
  state = { ...state, signedIn: !!nextSession };
  emit();
});

export function useSession() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function signOut() {
  void db.auth.signOut();
}

export function setCity(city: string) {
  state = { ...state, city };
  emit();
}

export function updateTicket(id: string, patch: Partial<DemoTicket>) {
  state = { ...state, tickets: state.tickets.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)) };
  emit();
}
