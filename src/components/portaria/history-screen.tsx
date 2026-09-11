import { useState } from "react";
import { useGate } from "@/lib/gate-store";
import type { HistoryEntry } from "@/lib/gate-store";

const outcomeLabel: Record<string, string> = {
  granted: "Liberado",
  granted_check_doc: "Liberado (meia)",
  used: "Já utilizado",
  cancelled: "Cancelado",
  not_found: "Não encontrado",
  wrong_event: "Outro evento",
  refused: "Recusado",
};

const outcomeColor: Record<string, string> = {
  granted: "text-emerald-400",
  granted_check_doc: "text-amber-300",
  used: "text-rose-400",
  cancelled: "text-rose-400",
  not_found: "text-rose-400",
  wrong_event: "text-orange-400",
  refused: "text-rose-400",
};

const refusedKinds = new Set(["used", "cancelled", "not_found", "wrong_event", "refused"]);

function nameOf(entry: HistoryEntry) {
  if ("ticket" in entry.result) return entry.result.ticket.name;
  return entry.code;
}

export function HistoryScreen() {
  const gate = useGate();
  const [onlyRefused, setOnlyRefused] = useState(false);

  const list = onlyRefused ? gate.history.filter((h) => refusedKinds.has(h.result.kind)) : gate.history;

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
        {list.length === 0 && <p className="text-sm font-semibold text-white/50">Nenhum registro ainda.</p>}
        {list.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="font-black">{nameOf(entry)}</p>
              <p className="text-xs font-semibold text-white/50">
                {new Date(entry.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {entry.offline ? " · aguardando envio" : ""}
              </p>
            </div>
            <span className={`text-sm font-black ${outcomeColor[entry.result.kind]}`}>{outcomeLabel[entry.result.kind]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
