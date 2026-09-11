// Edge Function: send-test-email (somente owner)
// Deploy MANUAL (copie esta pasta, incluindo ../_shared, para supabase/functions/):
//   supabase functions deploy send-test-email
// Secrets necessários: RESEND_API_KEY
import { z } from "https://esm.sh/zod@3.23.8";
import { handleOptions } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/http.ts";
import { getAdminClient, getAuthedUser, isOwner } from "../_shared/auth.ts";

const FN = "send-test-email";
const MAX_PER_HOUR = 5;

const bodySchema = z.object({}).strict();

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;
  if (req.method !== "POST") return errorResponse(req, FN, "E_METHOD", 405);

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return errorResponse(req, FN, "E_CONFIG", 500, "RESEND_API_KEY ausente");

    const user = await getAuthedUser(req);
    if (!user) return errorResponse(req, FN, "E_UNAUTHENTICATED", 401);

    // Corpo é opcional, mas se enviado deve ser estritamente vazio (sem campos desconhecidos).
    const rawText = await req.text();
    if (rawText.trim().length > 0) {
      let rawBody: unknown;
      try {
        rawBody = JSON.parse(rawText);
      } catch {
        return errorResponse(req, FN, "E_INVALID_BODY", 400);
      }
      const parsed = bodySchema.safeParse(rawBody);
      if (!parsed.success) return errorResponse(req, FN, "E_VALIDATION", 400);
    }

    const admin = getAdminClient();
    const ownerOk = await isOwner(admin, user.id);
    if (!ownerOk) return errorResponse(req, FN, "E_FORBIDDEN", 403);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countError } = await admin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", user.id)
      .eq("action", "send_test_email")
      .gte("created_at", oneHourAgo);
    if (countError) return errorResponse(req, FN, "E_INTERNAL", 500, countError);
    if ((recentCount ?? 0) >= MAX_PER_HOUR) {
      return errorResponse(req, FN, "E_RATE_LIMITED", 429);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Entrô <ingressos@jaentro.com.br>",
        to: [user.email],
        subject: "Teste de e-mail da Entrô",
        html: "<p>Se você recebeu esta mensagem, o envio de e-mails da Entrô está funcionando.</p>",
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      return errorResponse(req, FN, "E_SEND_FAILED", 502, { status: res.status, body });
    }

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "send_test_email",
      entity: "email",
      entity_id: null,
      details: {},
    });

    return jsonResponse(req, { ok: true });
  } catch (error) {
    return errorResponse(req, FN, "E_INTERNAL", 500, error);
  }
});
