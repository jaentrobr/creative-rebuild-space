/** Validação de arquivos antes do upload no Storage. */
import { UPLOAD_LIMITS } from "@/config/security";

export type UploadKind = "banner" | "logo" | "document";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const LABEL: Record<UploadKind, string> = {
  banner: "banner",
  logo: "logo",
  document: "documento",
};

/** Lê os primeiros bytes e devolve o tipo real do arquivo. */
export async function detectFileType(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const is = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  if (is(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (is(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (is(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (is(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50)
    return "image/webp";
  return null;
}

export type UploadCheck = { ok: true; type: string; extension: string } | { ok: false; error: string };

export async function checkUpload(file: File, kind: UploadKind): Promise<UploadCheck> {
  const limit = UPLOAD_LIMITS[kind];
  const allowed = kind === "document" ? ["image/jpeg", "image/png", "image/webp", "application/pdf"] : ["image/jpeg", "image/png", "image/webp"];

  if (file.size === 0) return { ok: false, error: "O arquivo está vazio." };
  if (file.size > limit) {
    return { ok: false, error: `O ${LABEL[kind]} deve ter no máximo ${Math.round(limit / (1024 * 1024))} MB.` };
  }

  const real = await detectFileType(file);
  if (!real || !allowed.includes(real)) {
    return {
      ok: false,
      error:
        kind === "document"
          ? "Envie um arquivo JPG, PNG, WEBP ou PDF válido."
          : "Envie uma imagem JPG, PNG ou WEBP válida.",
    };
  }
  return { ok: true, type: real, extension: EXT_BY_TYPE[real]! };
}

/** Nome de arquivo gerado pelo sistema (nunca o nome original). */
export function generateFileName(extension: string, prefix?: string): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix ? `${prefix}-` : ""}${id}.${extension}`;
}
