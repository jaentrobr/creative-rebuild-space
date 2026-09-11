// Helpers de resposta HTTP e tratamento de erro seguro (sem stack trace / dados internos).
import { buildCorsHeaders } from "./cors.ts";

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

/** Mensagem genérica para o cliente; loga o detalhe real só no servidor, sem dados pessoais. */
export function errorResponse(
  req: Request,
  functionName: string,
  code: string,
  status: number,
  logDetail?: unknown,
): Response {
  if (logDetail !== undefined) {
    console.error(`[${functionName}] ${code}`, logDetail);
  } else {
    console.error(`[${functionName}] ${code}`);
  }
  return jsonResponse(req, { error: "Não foi possível concluir", code }, status);
}

export function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
