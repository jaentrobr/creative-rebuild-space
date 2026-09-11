import { useSyncExternalStore } from "react";

type CookieChoice = "accepted" | "customized" | null;

const STORAGE_KEY = "entro:cookie-consent";

function readInitial(): CookieChoice {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "accepted" || value === "customized" ? value : null;
}

let state: CookieChoice = null;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function ensureHydrated() {
  if (!hydrated && typeof window !== "undefined") {
    state = readInitial();
    hydrated = true;
  }
}

export function useCookieConsent() {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureHydrated();
      return state;
    },
    () => null,
  );
}

export function acceptCookies() {
  state = "accepted";
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "accepted");
  emit();
}

export function customizeCookies() {
  state = "customized";
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "customized");
  emit();
}
