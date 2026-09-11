import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Ticket } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/entro-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_ROLES, useAuth } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { eventsSearch } from "@/lib/events-search";

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function SiteHeader() {
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const { city } = useSession();
  const { session, profile, roles, producer, signOut } = useAuth();
  const search = () =>
    navigate({ to: "/eventos", search: eventsSearch({ q: term, cidade: city }) });

  const signedIn = !!session;
  const isProducer = !!producer || roles.includes("producer");
  const isAdmin = roles.some((role) => ADMIN_ROLES.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link to="/" aria-label="Entrô — início" className="shrink-0">
          <img src={logo.url} alt="Entrô" className="h-13 w-auto sm:h-12" />
        </Link>

        <form
          className="hidden min-w-0 flex-1 lg:flex"
          onSubmit={(event) => {
            event.preventDefault();
            search();
          }}
        >
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar festas, artistas ou locais"
              className="h-10 pl-10"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <div className="flex items-center gap-2">
              <Link
                to="/meus-ingressos"
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary sm:hidden"
              >
                <Ticket className="size-5" />
                Meus ingressos
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="grid size-10 place-items-center overflow-hidden rounded-full bg-primary font-display text-sm font-extrabold text-primary-foreground"
                  aria-label="Minha conta"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    getInitials(profile?.full_name, profile?.email ?? session?.user.email)
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {profile?.full_name ? (
                    <div className="truncate px-2 py-1.5 text-sm font-bold text-foreground">
                      {profile.full_name}
                    </div>
                  ) : null}
                  <DropdownMenuItem
                    asChild
                    className="hidden sm:flex font-display text-sm font-bold"
                  >
                    <Link to="/meus-ingressos">Meus ingressos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="font-display text-sm font-bold">
                    <Link to="/meus-pedidos">Meus pedidos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="font-display text-sm font-bold">
                    <Link to="/minha-conta">Minha conta</Link>
                  </DropdownMenuItem>
                  {isProducer ? (
                    <DropdownMenuItem asChild className="font-display text-sm font-bold">
                      <Link to="/produtor">Painel do produtor</Link>
                    </DropdownMenuItem>
                  ) : null}
                  {isAdmin ? (
                    <DropdownMenuItem asChild className="font-display text-sm font-bold">
                      <Link to="/admin">Painel admin</Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    onSelect={() => void handleSignOut()}
                    className="font-display text-sm font-bold"
                  >
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link to="/cadastro">Criar conta</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/entrar" search={{ redirect: "" }}>
                  Entrar
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
