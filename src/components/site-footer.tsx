import { Link } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";
import logo from "@/assets/entro-logo.png.asset.json";
import { eventsSearch } from "@/lib/events-search";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-ink text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        <div>
          <img src={logo.url} alt="Entrô" className="h-16 w-auto" />
          <p className="mt-3 max-w-xs font-display text-base font-semibold text-primary-foreground/80">Seu próximo rolê começa aqui.</p>
        </div>
        <div>
          <p className="mb-3 font-display text-lg font-extrabold">Descubra</p>
          <nav className="grid content-start gap-3 text-sm text-primary-foreground/80">
            <Link to="/eventos" search={eventsSearch()}>Todos os eventos</Link>
            <Link to="/produtores">Para produtores</Link>
            <Link to="/meus-ingressos">Meus ingressos</Link>
          </nav>
        </div>
        <div>
          <p className="mb-3 font-display text-lg font-extrabold">Ajuda</p>
          <nav className="grid content-start gap-3 text-sm text-primary-foreground/80">
            <Link to="/ajuda">Central de ajuda</Link>
            <Link to="/termos">Termos de uso</Link>
            <Link to="/privacidade">Política de privacidade</Link>
          </nav>
        </div>
        <div>
          <p className="mb-3 font-display text-lg font-extrabold">Fale com a gente</p>
          <div className="grid content-start gap-3 text-sm text-primary-foreground/80">
            <a href="https://instagram.com/ja.entro" target="_blank" rel="noreferrer" className="flex items-center gap-2">
              <Instagram className="size-4 text-sun" /> @ja.entro
            </a>
            <a href="mailto:contato@jaentro.com.br" className="flex items-center gap-2">
              <Mail className="size-4 text-sun" /> contato@jaentro.com.br
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
