import { gateActions, getEventParticipants, getGateEvent, useGate } from "@/lib/gate-store";
import { Progress } from "@/components/ui/progress";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function PrepareScreen({ onOpenScanner }: { onOpenScanner: () => void }) {
  const gate = useGate();
  const event = getGateEvent();
  const total = getEventParticipants().length;

  if (!event) {
    return <p className="p-6 text-white">Nenhum evento vinculado a este usuário.</p>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-5 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-300">Evento</p>
        <h2 className="mt-1 text-2xl font-black">{event.name}</h2>
        <div className="mt-3 space-y-1 text-sm font-semibold text-white/80">
          <p>Data: {formatDateTime(event.startAt)}</p>
          <p>Abertura dos portões: {formatDateTime(event.gatesAt)}</p>
          <p>Local: {event.venue} — {event.city}/{event.state}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-black">Modo offline</h3>
        <p className="mt-1 text-sm text-white/60">
          Baixe a lista de ingressos para validar entradas mesmo sem internet.
        </p>

        {gate.downloading ? (
          <div className="mt-4 space-y-2">
            <Progress value={gate.downloadProgress} className="h-3" />
            <p className="text-sm font-bold text-white/70">Baixando... {Math.round(gate.downloadProgress)}%</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => gateActions.downloadList()}
            className="mt-4 h-14 w-full rounded-2xl bg-violet-500 text-lg font-black active:bg-violet-600"
          >
            Baixar lista para modo offline
          </button>
        )}

        {gate.downloaded && !gate.downloading && (
          <p className="mt-3 text-sm font-bold text-emerald-400">
            {gate.downloadedCount} ingressos baixados às {new Date(gate.downloadedAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => gateActions.setOnline(!gate.online)}
        className="h-12 w-full rounded-2xl border-2 border-white/20 text-sm font-bold text-white/80"
      >
        {gate.online ? "Simular sem internet" : "Voltar a ficar online"}
      </button>

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
          <p className="mt-2 text-center text-xs font-semibold text-white/50">Baixe a lista para liberar o leitor.</p>
        )}
      </div>
    </div>
  );
}
