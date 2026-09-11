import { createClient } from "@supabase/supabase-js";

/**
 * Cliente administrativo apontando para o Supabase próprio do projeto.
 * Use apenas dentro de handlers de server functions / server routes.
 */
export function getMeuSupabaseAdmin() {
  const url = "https://efkdhroootmfleltepye.supabase.co";
  const serviceRoleKey = process.env["MEU_SUPABASE_SERVICE_ROLE_KEY"];

  if (!serviceRoleKey) {
    throw new Error("MEU_SUPABASE_SERVICE_ROLE_KEY não está configurada.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
