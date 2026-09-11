import { useMemo, useState } from "react";
import { gateActions, getParticipants, useGate, type ScanResult } from "@/lib/gate-store";
import type { DisplayTicket } from "@/data/gate";

const statusLabel: Record<string, string> = {
  valid: "Válido",
  used: "Já utilizado",
  transferred: "Transferido",
  refunded: "Reembolsado",
  canceled: "Cancelado",
};

export function ManualSearch({ onResult }: { onResult: (result: ScanResult) => void }) {
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  useGate();
  const participants = getParticipants();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return participants
      .filter((p) => {
        const digits = (p.document ?? "").replace(/\D/g, "");
        return (
          p.name.toLowerCase().includes(q) ||
          digits.slice(-3) === q ||
          p.qrToken.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [query, participants]);

  const confirming = results.find((r) => r.id === confirmId) ?? null;

  const doCheckin = async (p: DisplayTicket) => {
    if (checkingId) return;
    setConfirmId(null);
    setCheckingId(p.id);
    try {
      const result = await gateActions.scanCode(p.qrToken);
      if (result) onResult(result);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-5 text-white">
      <h2 className="text-2xl font-black">Busca manual</h2>
      <input
        placeholder="Nome, últimos 3 dígitos do CPF ou código"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-14 w-full rounded-2xl border-2 border-white/15 bg-white/5 px-4 text-base font-semibold text-white placeholder:text-white/40 focus:border-violet-400 focus:outline-none"
      />

      <div className="flex-1 space-y-3 overflow-y-auto">
        {results.length === 0 && query.trim() && (
          <p className="text-sm font-semibold text-white/50">Nenhum ingresso encontrado.</p>
        )}
        {results.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-lg font-black">{p.name}</p>
            <p className="text-sm font-semibold text-white/70">
              {p.type} — {p.lot} {p.half ? "· Meia-entrada" : ""}
            </p>
            <p className="mt-1 text-sm font-bold">
              Status:{" "}
              <span className={p.status === "valid" ? "text-emerald-400" : "text-rose-400"}>
                {statusLabel[p.status] ?? p.status}
              </span>
            </p>
            {p.status === "valid" && (
              <button
                type="button"
                disabled={checkingId === p.id}
                onClick={() => setConfirmId(p.id)}
                className="mt-3 h-11 w-full rounded-xl bg-violet-500 text-sm font-black disabled:opacity-50"
              >
                {checkingId === p.id ? "Verificando…" : "Fazer check-in"}
              </button>
            )}
          </div>
        ))}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-[#1B1024] p-6 text-white">
            <p className="text-lg font-black">Confirmar check-in de {confirming.name}?</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="h-12 flex-1 rounded-xl border-2 border-white/20 font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={checkingId === confirming.id}
                onClick={() => void doCheckin(confirming)}
                className="h-12 flex-1 rounded-xl bg-emerald-500 font-black text-black disabled:opacity-50"
              >
                {checkingId === confirming.id ? "Enviando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
