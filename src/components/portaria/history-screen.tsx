import { useState } from "react";
import { useGate, type HistoryEntry } from "@/lib/gate-store";

const outcomeLabel: Record<HistoryEntry["kind"], string> = {
  granted: "Liberado",
  granted_check_doc: "Liberado (meia)",
  already_used: "Já utilizado",
  canceled: "Cancelado",
  not_found: "Não encontrado",
  other_event: "Outro evento",
};

const outcomeColor: Record<HistoryEntry["kind"], string> = {
  granted: "text-emerald-400",
  granted_check_doc: "text-amber-300",
  already_used: "text-rose-400",
  canceled: "text-rose-400",
  not_found: "text-rose-400",
  other_event: "text-orange-400",
};

const refusedKinds = new Set<HistoryEntry["kind"]>(["already_used", "canceled", "not_found", "other_event"]);

export function HistoryScreen() {
  const gate = useGate();
  const [onlyRefused, setOnlyRefused] = useState(false);

  const list = onlyRefused ? gate.history.filter((h) => refusedKinds.has(h.kind)) : gate.history;

  return (
    <div className="flex flex-1 flex-col gap-4 p-5 text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">Histórico</h2>
        <button
          type="button"
          onClick={() => setOnlyRefused((v) => !v)}
          className={`rounded-full px-4 py-2 text-xs font-bold ${onlyRefused ? "bg-rose-500 text-white" : "border-2 border-white/20 text-white/70"}`}
        >
          Só recusados
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {list.length === 0 && <p className="text-sm font-semibold text-white/50">Nenhum registro nesta sessão.</p>}
        {list.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="font-black">{entry.label}</p>
              <p className="text-xs font-semibold text-white/50">
                {new Date(entry.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {entry.offline ? " · aguardando envio" : ""}
              </p>
            </div>
            <span className={`text-sm font-black ${outcomeColor[entry.kind]}`}>{outcomeLabel[entry.kind]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
