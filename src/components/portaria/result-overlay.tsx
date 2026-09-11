import { useEffect } from "react";
import type { ScanResult } from "@/lib/gate-store";
import { playBeep } from "@/components/portaria/beep";

const styles: Record<ScanResult["kind"], { bg: string; title: string; sound: "granted" | "warning" | "denied" }> = {
  granted: { bg: "bg-emerald-500", title: "LIBERADO", sound: "granted" },
  granted_check_doc: { bg: "bg-amber-400", title: "LIBERADO: CONFIRA O DOCUMENTO", sound: "warning" },
  already_used: { bg: "bg-rose-600", title: "JÁ UTILIZADO", sound: "denied" },
  canceled: { bg: "bg-rose-600", title: "INGRESSO CANCELADO", sound: "denied" },
  not_found: { bg: "bg-rose-600", title: "INGRESSO NÃO ENCONTRADO", sound: "denied" },
  other_event: { bg: "bg-orange-500", title: "INGRESSO DE OUTRO EVENTO", sound: "warning" },
};

export function ResultOverlay({
  result,
  onClose,
  onConfirmDoc,
  onRefuse,
}: {
  result: ScanResult;
  onClose: () => void;
  onConfirmDoc?: () => void;
  onRefuse?: () => void;
}) {
  const style = styles[result.kind];

  useEffect(() => {
    playBeep(style.sound);
    if (result.kind === "granted_check_doc") return undefined;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [result]);

  const ticket = "ticket" in result ? result.ticket : undefined;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 text-center text-white ${style.bg}`}>
      <p className="text-4xl font-black leading-tight">{style.title}</p>
      {ticket && (
        <div className="mt-2 space-y-1 text-lg font-semibold">
          <p className="text-2xl font-black">{ticket.name}</p>
          <p>
            {ticket.type} — {ticket.lot}
          </p>
          {result.kind === "granted" || result.kind === "granted_check_doc" ? (
            <p className="text-sm font-medium opacity-80">
              {result.offline ? "Offline — check-in salvo no aparelho" : "Check-in confirmado"}
            </p>
          ) : null}
        </div>
      )}
      {result.kind === "already_used" && result.usedAt && (
        <p className="text-lg font-semibold">
          Entrou às {new Date(result.usedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      {result.kind === "other_event" && result.eventName && (
        <p className="text-lg font-semibold">Evento correto: {result.eventName}</p>
      )}
      {result.kind === "not_found" && <p className="text-lg font-semibold">Código: {result.code}</p>}

      {result.kind === "granted_check_doc" && (
        <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={onConfirmDoc}
            className="rounded-2xl bg-white px-6 py-4 text-xl font-black text-emerald-700"
          >
            Documento OK
          </button>
          <button
            type="button"
            onClick={onRefuse}
            className="rounded-2xl border-2 border-white px-6 py-4 text-xl font-black text-white"
          >
            Recusar entrada
          </button>
        </div>
      )}

      {result.kind !== "granted_check_doc" && (
        <button type="button" onClick={onClose} className="mt-6 text-sm font-semibold underline underline-offset-4">
          Fechar
        </button>
      )}
    </div>
  );
}
