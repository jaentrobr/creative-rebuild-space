import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  children: ReactNode;
  /** Se informado, o usuário precisa ter pelo menos um destes papéis. */
  roles?: AppRole[];
  /** Para onde mandar quem não está logado. */
  redirectTo?: string;
};

export function RequireAuth({ children, roles, redirectTo = "/entrar" }: Props) {
  const { loading, user, roles: userRoles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.href });

  const allowed = !roles || userRoles.some((role) => roles.includes(role));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: redirectTo, search: { redirect: pathname } as never, replace: true });
    }
  }, [loading, user, navigate, redirectTo, pathname]);

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-muted-foreground">
          Sua conta não tem permissão para ver esta área.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
