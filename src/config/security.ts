/** Configurações de segurança do front-end. Nenhum segredo aqui. */

export const TURNSTILE_SITE_KEY = "0x4AAAAAAEwwf_gQonKP97nO";

export const CAPTCHA_ERROR = "Confirme que você não é um robô e tente de novo";

/** Limites de texto espelhados do banco (v4). */
export const TEXT_LIMITS = {
  fullName: 120,
  producerName: 80,
  producerDescription: 2000,
  eventDescription: 10000,
  venue: 150,
  rescheduleReason: 500,
  ticketType: 60,
  batch: 60,
  promoter: 80,
  userAgent: 500,
} as const;

/** Limites de upload em bytes. */
export const UPLOAD_LIMITS = {
  banner: 5 * 1024 * 1024,
  logo: 2 * 1024 * 1024,
  document: 10 * 1024 * 1024,
} as const;

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_MIME = [...IMAGE_MIME, "application/pdf"] as const;

/** Tempo de inatividade no /admin antes do logout automático. */
export const ADMIN_IDLE_MS = 15 * 60 * 1000;
