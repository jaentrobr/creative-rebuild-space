import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { db } from "@/integrations/meu-supabase/client";
import type { Enums, Tables } from "@/integrations/meu-supabase/types";

export type AppRole = Enums<"app_role">;

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Tables<"profiles"> | null;
  roles: AppRole[];
  producer: Tables<"producers"> | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [producer, setProducer] = useState<Tables<"producers"> | null>(null);

  const loadUserData = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setRoles([]);
      setProducer(null);
      return;
    }
    const [profileRes, rolesRes, producerRes] = await Promise.all([
      db.from("profiles").select("*").eq("id", userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", userId),
      db.from("producers").select("*").eq("owner_id", userId).maybeSingle(),
    ]);
    setProfile(profileRes.data ?? null);
    setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
    setProducer(producerRes.data ?? null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await db.auth.getSession();
    setSession(data.session ?? null);
    await loadUserData(data.session?.user?.id);
  }, [loadUserData]);

  useEffect(() => {
    let active = true;
    const { data: sub } = db.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRoles([]);
        setProducer(null);
        return;
      }
      void loadUserData(nextSession?.user?.id);
    });

    void (async () => {
      const { data } = await db.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      await loadUserData(data.session?.user?.id);
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    await db.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoles([]);
    setProducer(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      roles,
      producer,
      refresh,
      signOut,
    }),
    [loading, session, profile, roles, producer, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

export function useHasRole(...allowed: AppRole[]) {
  const { roles } = useAuth();
  return roles.some((role) => allowed.includes(role));
}

export const ADMIN_ROLES: AppRole[] = ["owner", "finance", "support"];
