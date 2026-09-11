// Edge Function: health-check (somente owner com aal2/MFA)
// Deploy MANUAL (copie esta pasta, incluindo ../_shared, para supabase/functions/):
//   supabase functions deploy health-check
// Secrets necessários: os mesmos das demais funções, apenas para checar presença (RESEND_API_KEY, SITE_URL).
import { z } from "https://esm.sh/zod@3.23.8";
import { handleOptions } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/http.ts";
import { getAdminClient, getAuthedUser, isOwner } from "../_shared/auth.ts";

const FN = "health-check";
const bodySchema = z.object({}).strict();

async function checkBucket(admin: ReturnType<typeof getAdminClient>, name: string): Promise<boolean> {
  const { data, error } = await admin.storage.getBucket(name);
  return !error && !!data;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;
  if (req.method !== "POST") return errorResponse(req, FN, "E_METHOD", 405);

  try {
    const user = await getAuthedUser(req);
    if (!user) return errorResponse(req, FN, "E_UNAUTHENTICATED", 401);
    if (user.aal !== "aal2") return errorResponse(req, FN, "E_MFA_REQUIRED", 403);

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

    const dbCheck = await admin.from("platform_settings").select("id").eq("id", 1).maybeSingle();
    const database = !dbCheck.error;

    const secrets = {
      RESEND_API_KEY: !!Deno.env.get("RESEND_API_KEY"),
      SITE_URL: !!Deno.env.get("SITE_URL"),
    };

    const buckets = {
      "event-banners": await checkBucket(admin, "event-banners"),
      "producer-logos": await checkBucket(admin, "producer-logos"),
      "home-banners": await checkBucket(admin, "home-banners"),
      "verification-docs": await checkBucket(admin, "verification-docs"),
    };

    const authHeader = req.headers.get("Authorization") ?? "";
    const functionsBaseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

    async function pingFunction(name: string, body: Record<string, unknown>): Promise<boolean> {
      try {
        const res = await fetch(`${functionsBaseUrl}/${name}`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        // Qualquer resposta HTTP válida (mesmo 4xx de validação/permissão) indica que a função está no ar.
        return res.status < 500;
      } catch {
        return false;
      }
    }

    const functions = {
      "issue-tickets": await pingFunction("issue-tickets", {
        event_id: "00000000-0000-0000-0000-000000000000",
        items: [],
      }),
      "create-staff-user": await pingFunction("create-staff-user", {
        event_id: "00000000-0000-0000-0000-000000000000",
        display_name: "x",
        username: "x",
        email: "healthcheck@example.com",
        password: "x",
      }),
      "notify-event-reschedule": await pingFunction("notify-event-reschedule", {
        event_id: "00000000-0000-0000-0000-000000000000",
      }),
      "send-test-email": await pingFunction("send-test-email", {}),
    };

    return jsonResponse(req, { database, secrets, buckets, functions });
  } catch (error) {
    return errorResponse(req, FN, "E_INTERNAL", 500, error);
  }
});
