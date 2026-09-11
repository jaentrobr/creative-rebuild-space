import { useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptCookies, customizeCookies, useCookieConsent } from "@/lib/cookie-consent";

export function CookieBar() {
  const consent = useCookieConsent();
  const [dismissedNow, setDismissedNow] = useState(false);

  if (consent || dismissedNow) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-sm sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2 text-center text-muted-foreground sm:text-left">
          <Cookie className="size-4 shrink-0 text-primary" />
          Usamos cookies para melhorar sua experiência na Entrô.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              customizeCookies();
              setDismissedNow(true);
            }}
          >
            Configurar
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
