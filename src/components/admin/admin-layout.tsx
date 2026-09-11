import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Ticket,
  Undo2,
  UserCircle2,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/entro-logo.png.asset.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true, roles: ["owner", "finance", "support"] },
  { to: "/admin/produtores", label: "Produtores", icon: Users, roles: ["owner", "finance", "support"] },
  { to: "/admin/eventos", label: "Eventos", icon: CalendarDays, roles: ["owner", "finance", "support"] },
  { to: "/admin/pedidos", label: "Pedidos", icon: Ticket, roles: ["owner", "finance", "support"] },
  { to: "/admin/reembolsos", label: "Reembolsos e chargebacks", short: "Reembolsos", icon: Undo2, roles: ["owner", "finance", "support"] },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet, roles: ["owner", "finance"] },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, roles: ["owner"] },
  { to: "/admin/equipe", label: "Equipe", icon: ShieldCheck, roles: ["owner"] },
] as const satisfies ReadonlyArray<{ to: string; label: string; short?: string; icon: typeof LayoutDashboard; exact?: boolean; roles: AppRole[] }>;

export function AdminLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { roles, profile, user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname.startsWith(to));

  const visible = navItems.filter((item) => item.roles.some((r) => roles.includes(r)));
  const mobileMain = visible.slice(0, 3);
  const mobileMore = visible.slice(3);

  const doSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r-2 border-foreground bg-background p-4 lg:flex">
        <Link to="/admin" className="mb-6 flex items-center gap-2">
          <img src={logo.url} alt="Entrô" className="h-9 w-auto" />
          <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">Admin</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {visible.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive(item.to, "exact" in item ? item.exact : false)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={doSignOut}
          className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Sair do admin
        </button>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b-2 border-foreground bg-background px-4 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2 lg:hidden">
            <img src={logo.url} alt="Entrô" className="h-8 w-auto" />
            <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">
              {profile?.full_name ?? user?.email}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Conta do admin"
                className="grid size-10 place-items-center rounded-full bg-destructive font-display text-sm font-extrabold text-destructive-foreground"
              >
                <UserCircle2 className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {roles.includes("owner") ? (
                  <DropdownMenuItem asChild><Link to="/admin/configuracoes">Configurações</Link></DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild><Link to="/">Voltar para o site</Link></DropdownMenuItem>
                <DropdownMenuItem onSelect={doSignOut}>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
              {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-foreground bg-background lg:hidden">
        {mobileMain.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold",
              isActive(item.to, "exact" in item ? item.exact : false) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {"short" in item ? item.short : item.label}
          </Link>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-muted-foreground">
            <Menu className="size-5" /> Mais
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            {mobileMore.map((item) => (
              <DropdownMenuItem key={item.to} asChild><Link to={item.to}>{item.label}</Link></DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild><Link to="/">Voltar para o site</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}

export { PanelCard, StatCard, StatusPill, BackToPanel } from "@/components/producer/producer-layout";
