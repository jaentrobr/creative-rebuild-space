/** Desloga automaticamente do /admin após ADMIN_IDLE_MS sem atividade do usuário. */
import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ADMIN_IDLE_MS } from "@/config/security";
import { useAuth } from "@/lib/auth";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function AdminIdleLogout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const doLogout = () => {
      void signOut().then(() => {
        toast.info("Sua sessão do admin foi encerrada por inatividade.");
        navigate({ to: "/entrar" });
      });
    };

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(doLogout, ADMIN_IDLE_MS);
    };

    reset();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [signOut, navigate]);

  return <>{children}</>;
}
