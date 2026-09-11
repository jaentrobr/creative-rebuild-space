import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  LayoutDashboard,
  Menu,
  Settings,
  Undo2,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/entro-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useProducerEvents } from "@/lib/producer-queries";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/produtor", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/produtor/eventos", label: "Meus eventos", short: "Eventos", icon: CalendarDays },
  { to: "/produtor/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/produtor/reembolsos", label: "Reembolsos", icon: Undo2 },
  { to: "/produtor/verificacao", label: "Verificação", icon: BadgeCheck },
  { to: "/produtor/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function ProducerLayout({
  title,
  description,
  actions,
  children,
  selectedEvent,
  onSelectEvent,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  selectedEvent?: string;
  onSelectEvent?: (value: string) => void;
}) {
  const { producer, signOut } = useAuth();
  const { data: events = [] } = useProducerEvents(producer?.id);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);
  const mobileMain = navItems.slice(0, 3);
  const mobileMore = navItems.slice(3);
  const initials = (producer?.display_name ?? "??").trim().slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r-2 border-foreground bg-background p-4 lg:flex">
        <Link to="/produtor" className="mb-6 flex items-center gap-2">
          <img src={logo.url} alt="Entrô" className="h-9 w-auto" />
          <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            Produtor
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
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
        <Link
          to="/"
          className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar para o site
        </Link>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b-2 border-foreground bg-background px-4 sm:px-6">
          <Link to="/produtor" className="lg:hidden">
            <img src={logo.url} alt="Entrô" className="h-8 w-auto" />
          </Link>
          {onSelectEvent ? (
            <div className="ml-auto w-44 sm:w-60 lg:ml-0">
              <Select value={selectedEvent ?? "todos"} onValueChange={onSelectEvent}>
                <SelectTrigger aria-label="Selecionar evento">
                  <SelectValue placeholder="Todos os eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os eventos</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Conta do produtor"
                className="grid size-10 place-items-center overflow-hidden rounded-full bg-primary font-display text-sm font-extrabold text-primary-foreground"
              >
                {producer?.logo_url ? (
                  <img
                    src={producer.logo_url}
                    alt={producer.display_name}
                    className="size-10 object-cover"
                  />
                ) : (
                  initials
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/produtor/configuracoes">Configurações</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/produtor/verificacao" search={{ voltar: "" }}>
                    Verificação
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/">Voltar para o site</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut();
                    void navigate({ to: "/" });
                  }}
                >
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
              {description ? (
                <p suppressHydrationWarning className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
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
              isActive(item.to, "exact" in item ? item.exact : false)
                ? "text-primary"
                : "text-muted-foreground",
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
              <DropdownMenuItem key={item.to} asChild>
                <Link to={item.to}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Link to="/">Voltar para o site</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "sun";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-foreground p-4 shadow-pop",
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : tone === "sun"
            ? "bg-sun text-ink"
            : "bg-background",
      )}
    >
      <p
        className={cn(
          "text-xs font-bold uppercase tracking-wide",
          tone === "default" ? "text-muted-foreground" : "opacity-80",
        )}
      >
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      {hint ? (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "default" ? "text-muted-foreground" : "opacity-80",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PanelCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-foreground bg-background p-4 shadow-pop sm:p-5",
        className,
      )}
    >
      {title || action ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title ? <h2 className="font-display text-lg font-extrabold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Publicado" ||
    status === "published" ||
    status === "approved" ||
    status === "Aprovado" ||
    status === "done" ||
    status === "Concluído" ||
    status === "valid" ||
    status === "Válido"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Rascunho" ||
          status === "draft" ||
          status === "pending" ||
          status === "Em análise" ||
          status === "processing" ||
          status === "Processando" ||
          status === "requested"
        ? "bg-sun/60 text-ink"
        : status === "Cancelado" ||
            status === "canceled" ||
            status === "rejected" ||
            status === "Recusado" ||
            status === "refunded" ||
            status === "Reembolsado" ||
            status === "failed"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold leading-none",
        tone,
      )}
    >
      {status}
    </span>
  );
}

export function BackToPanel({ to, label }: { to: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to={to}>
        <ArrowLeft className="size-4" /> {label}
      </Link>
    </Button>
  );
}
