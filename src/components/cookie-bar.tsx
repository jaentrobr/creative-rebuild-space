import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptCookies, customizeCookies, useCookieConsent } from "@/lib/cookie-consent";

export function CookieBar() {
  const consent = useCookieConsent();
  const [dismissedNow, setDismissedNow] = useState(false);

  if (consent || dismissedNow) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-3 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-sm sm:flex-row sm:justify-between sm:gap-3">
        <p className="whitespace-nowrap text-[10px] text-muted-foreground min-[380px]:text-[11px] sm:flex sm:items-center sm:gap-2 sm:text-left sm:text-sm">
          <Cookie className="hidden size-4 shrink-0 text-primary sm:block" />
          Usamos cookies para melhorar sua experiência na Entrô.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              to="/privacidade"
              hash="cookies"
              onClick={() => {
                customizeCookies();
                setDismissedNow(true);
              }}
            >
              Configurar
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              acceptCookies();
              setDismissedNow(true);
            }}
          >
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
