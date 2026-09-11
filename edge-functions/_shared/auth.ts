// Autenticação e autorização compartilhadas. Nunca confie em dados vindos do corpo da requisição:
// sempre valide o usuário pelo token e confira papel/posse no banco.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AuthedUser = {
  id: string;
  email: string | null;
  aal: string | null;
};

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Valida o JWT do usuário a partir do header Authorization usando o client anon. */
export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;

  let aal: string | null = null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    aal = typeof payload?.aal === "string" ? payload.aal : null;
  } catch {
    aal = null;
  }

  return { id: data.user.id, email: data.user.email ?? null, aal };
}

export async function isAdmin(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.rpc("is_admin", { _user_id: userId });
  return data === true;
}

export async function isOwner(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.rpc("is_owner", { _user_id: userId });
  return data === true;
}

export async function isProducerOwner(
  admin: SupabaseClient,
  userId: string,
  producerId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("producers")
    .select("id")
    .eq("id", producerId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !!data;
}

export async function isEventStaffOrOwnerOrAdmin(
  admin: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<{ allowed: boolean; ownerId: string | null }> {
  const { data: event } = await admin
    .from("events")
    .select("id, producer_id, producers(owner_id)")
    .eq("id", eventId)
    .maybeSingle();
  const ownerId =
    (event as { producers?: { owner_id?: string } | null } | null)?.producers?.owner_id ?? null;
  if (!event) return { allowed: false, ownerId: null };
  if (ownerId === userId) return { allowed: true, ownerId };
  const admin_ = await isAdmin(admin, userId);
  if (admin_) return { allowed: true, ownerId };
  return { allowed: false, ownerId };
}
