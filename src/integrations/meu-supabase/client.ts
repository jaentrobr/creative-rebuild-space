// Cliente do Supabase próprio do projeto, tipado com o schema real.
// Reaproveita o cliente do browser (que já aponta para VITE_SUPABASE_URL do
// projeto efkdhroootmfleltepye) e apenas troca a tipagem.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as rawSupabase } from "@/integrations/supabase/client";
import type { Database } from "./types";

export const db = rawSupabase as unknown as SupabaseClient<Database>;
export type { Database };
export * from "./types";
