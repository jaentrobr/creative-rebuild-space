import { useEffect, useState } from "react";
import { Share, SquarePlus } from "lucide-react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Discreet hint prompting the user to add the app to their home screen,
 * meant to be used on the /portaria area. Renders nothing once the app
 * is already installed/standalone or after it's been dismissed.
 */
export function PwaInstallHint() {
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
  }, []);

  if (standalone || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 p-3 text-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <SquarePlus className="size-5" />
      </span>
      <p className="flex-1 text-muted-foreground">
        Adicione a Entrô à tela inicial para abrir a portaria mais rápido, mesmo offline.
        <span className="ml-1 inline-flex items-center gap-1 font-semibold text-foreground">
          Toque em <Share className="size-3.5" /> e depois em "Adicionar à Tela de Início".
        </span>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-xs font-semibold text-muted-foreground underline"
      >
        Ocultar
      </button>
    </div>
  );
}
