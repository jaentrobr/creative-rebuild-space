import { useEffect, useState } from "react";
import { toast } from "sonner";
import { gateActions, useGate } from "@/lib/gate-store";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function StatusBar() {
  const gate = useGate();
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!gate.downloadedAt) return setStale(false);
      const ageMs = Date.now() - new Date(gate.downloadedAt).getTime();
      setStale(ageMs > 2 * 60 * 60 * 1000);
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [gate.downloadedAt]);

  return (
    <div className="w-full border-b border-white/10 bg-[#150C22] px-4 py-2 text-white">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-semibold">
        <span
          className={`flex items-center gap-1.5 ${gate.online ? "text-emerald-400" : "text-rose-400"}`}
        >
          <span
            className={`size-2 rounded-full ${gate.online ? "bg-emerald-400" : "bg-rose-400"}`}
          />
          {gate.online ? "Online" : "Offline"}
        </span>
        <span className="text-white/70">Última sinc.: {formatTime(gate.lastSync)}</span>
        <span className="text-white/70">
          Check-ins aguardando envio:{" "}
          <span className="font-black text-amber-300">{gate.pending.length}</span>
        </span>
        {gate.pending.length > 0 && (
          <button
            type="button"
            disabled={!gate.online || gate.isSyncing}
            onClick={async () => {
              const { synced, failed } = await gateActions.syncPending();
              if (synced > 0) toast.success(`${synced} check-in(s) sincronizado(s)`);
              if (failed > 0) toast.error(`${failed} check-in(s) não puderam ser enviados. Vamos tentar de novo.`);
            }}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-white/80 disabled:opacity-40"
          >
            {gate.isSyncing ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        )}
      </div>
      {stale && (
        <p className="mt-1 rounded-lg bg-amber-400/15 px-2 py-1 text-xs font-bold text-amber-300">
          Atualize a lista antes de abrir os portões
        </p>
      )}
    </div>
  );
}
