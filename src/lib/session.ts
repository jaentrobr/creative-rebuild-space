import { useSyncExternalStore } from "react";

/**
 * Store client-side apenas para o filtro de cidade usado na busca de eventos.
 * Autenticação real vive em `@/lib/auth` (useAuth) — este arquivo não deve
 * mais expor `signedIn`, `tickets` ou `signOut` (removidos por serem dados
 * falsos de demonstração).
 */
type SessionState = { city: string };

let state: SessionState = { city: "" };
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

export function setCity(city: string) {
  state = { ...state, city };
  emit();
}
