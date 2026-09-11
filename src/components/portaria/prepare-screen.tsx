import { gateActions, getParticipants, getGateEvent, useGate } from "@/lib/gate-store";
import { Progress } from "@/components/ui/progress";

export function PrepareScreen({ onOpenScanner }: { onOpenScanner: () => void }) {
  const gate = useGate();
  const event = getGateEvent();
  const total = getParticipants().length;

  if (!event) {
    return <p className="p-6 text-white">Nenhum evento vinculado a este usuário.</p>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-5 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-300">Evento</p>
        <h2 className="mt-1 text-2xl font-black">{event.eventTitle}</h2>
        <p className="mt-2 text-sm font-semibold text-white/80">Portaria: {event.displayName}</p>

        {gate.staffEvents.length > 1 && (
          <select
            value={gate.selectedEventId ?? ""}
            onChange={(e) => gateActions.selectEvent(e.target.value)}
            className="mt-4 h-12 w-full rounded-xl border-2 border-white/15 bg-[#1B1024] px-3 text-sm font-bold text-white"
          >
            {gate.staffEvents.map((s) => (
              <option key={s.eventId} value={s.eventId}>
                {s.eventTitle}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-black">Modo offline</h3>
        <p className="mt-1 text-sm text-white/60">
          Baixe a lista de ingressos para validar entradas mesmo sem internet.
        </p>

        {gate.downloading ? (
          <div className="mt-4 space-y-2">
            <Progress value={gate.downloadProgress} className="h-3" />
            <p className="text-sm font-bold text-white/70">
              Baixando... {Math.round(gate.downloadProgress)}%
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void gateActions.downloadList()}
            className="mt-4 h-14 w-full rounded-2xl bg-violet-500 text-lg font-black active:bg-violet-600"
          >
            Baixar lista para modo offline
          </button>
        )}

        {gate.downloaded && !gate.downloading && (
          <p className="mt-3 text-sm font-bold text-emerald-400">
            {total} ingressos baixados
            {gate.downloadedAt
              ? ` às ${new Date(gate.downloadedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
        )}
      </div>

      <div className="mt-auto">
        <button
          type="button"
          onClick={onOpenScanner}
          disabled={!gate.downloaded}
          className="h-16 w-full rounded-2xl bg-emerald-500 text-xl font-black text-black disabled:opacity-40"
        >
          Abrir leitor de QR ({total} ingressos)
        </button>
        {!gate.downloaded && (
          <p className="mt-2 text-center text-xs font-semibold text-white/50">
            Baixe a lista para liberar o leitor.
          </p>
        )}
      </div>
    </div>
  );
}
