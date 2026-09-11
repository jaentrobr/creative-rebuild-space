// Edge Function: create-staff-user
// Cria um usuário de portaria (event_staff) para um evento. Somente o dono do produtor
// ou um admin da plataforma pode criar. Limite de 20 porteiros por evento.
// Deploy MANUAL (copie esta pasta, incluindo ../_shared, para supabase/functions/):
//   supabase functions deploy create-staff-user
// Secrets necessários: nenhum além dos padrões (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
import { z } from "https://esm.sh/zod@3.23.8";
import { handleOptions } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/http.ts";
import { getAdminClient, getAuthedUser, isEventStaffOrOwnerOrAdmin } from "../_shared/auth.ts";

const FN = "create-staff-user";
const MAX_STAFF_PER_EVENT = 20;

const bodySchema = z
  .object({
    event_id: z.string().uuid(),
    display_name: z.string().trim().min(2).max(80),
    username: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[a-z0-9._-]+$/i),
    email: z.string().trim().email().max(160),
    password: z.string().min(8).max(72),
  })
  .strict();

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;
  if (req.method !== "POST") return errorResponse(req, FN, "E_METHOD", 405);

  try {
    const user = await getAuthedUser(req);
    if (!user) return errorResponse(req, FN, "E_UNAUTHENTICATED", 401);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse(req, FN, "E_INVALID_BODY", 400);
    }
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) return errorResponse(req, FN, "E_VALIDATION", 400);
    const { event_id, display_name, username, email, password } = parsed.data;

    const admin = getAdminClient();

    const { allowed } = await isEventStaffOrOwnerOrAdmin(admin, user.id, event_id);
    if (!allowed) return errorResponse(req, FN, "E_FORBIDDEN", 403);

    const { count: staffCount, error: countError } = await admin
      .from("event_staff")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event_id);
    if (countError) return errorResponse(req, FN, "E_INTERNAL", 500, countError);
    if ((staffCount ?? 0) >= MAX_STAFF_PER_EVENT) {
      return errorResponse(req, FN, "E_LIMIT_EXCEEDED", 422);
    }

    const { data: usernameTaken } = await admin
      .from("event_staff")
      .select("id")
      .eq("event_id", event_id)
      .eq("username", username)
      .maybeSingle();
    if (usernameTaken) return errorResponse(req, FN, "E_USERNAME_TAKEN", 409);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      return errorResponse(req, FN, "E_CREATE_USER", 500, createError);
    }

    const { data: staffRow, error: staffError } = await admin
      .from("event_staff")
      .insert({
        event_id,
        user_id: created.user.id,
        display_name,
        username,
        is_active: true,
      })
      .select("id, event_id, display_name, username, is_active, created_at")
      .single();
    if (staffError) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return errorResponse(req, FN, "E_INTERNAL", 500, staffError);
    }

    return jsonResponse(req, { staff: staffRow });
  } catch (error) {
    return errorResponse(req, FN, "E_INTERNAL", 500, error);
  }
});
