/** Helpers para tratar URLs e redirecionamentos vindos do usuário. */

/** Só aceita caminho interno começando com "/" (e não "//"). */
export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\") || /[\r\n\t]/.test(trimmed)) return fallback;
  return trimmed;
}

const SAFE_PROTOCOLS = ["https:", "mailto:", "tel:"];

/** Devolve o href se for https/mailto/tel, senão undefined. */
export function safeExternalHref(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.trim();
  try {
    const url = new URL(raw);
    return SAFE_PROTOCOLS.includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Link de conteúdo (markdown, perfil) — interno ou https/mailto/tel. */
export function safeContentHref(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().startsWith("/")) {
    const internal = safeInternalPath(value, "");
    return internal || undefined;
  }
  return safeExternalHref(value);
}

const STORAGE_HOST = (() => {
  try {
    return new URL(import.meta.env['VITE_SUPABASE_URL'] ?? "https://invalid.local").host;
  } catch {
    return "invalid.local";
  }
})();

/** Só permite imagens https do nosso Storage (ou assets locais). */
export function safeImageSrc(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.trim();
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return undefined;
    return url.host === STORAGE_HOST ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Atributos obrigatórios em links de terceiros. */
export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer nofollow",
} as const;
