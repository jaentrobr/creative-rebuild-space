import { useState } from "react";
import { QrScanner } from "@/components/portaria/qr-scanner";
import { ResultOverlay } from "@/components/portaria/result-overlay";
import { TestCodesSheet } from "@/components/portaria/test-codes-sheet";
import { gateActions, getEnteredCounts, useGate, type ScanResult } from "@/lib/gate-store";

export function ScannerScreen({ active }: { active: boolean }) {
  const gate = useGate();
  const [result, setResult] = useState<ScanResult | null>(null);
  const counts = getEnteredCounts();

  const handleScan = (code: string) => {
    if (result) return;
    const r = gateActions.scanCode(code);
    if (r) setResult(r);
  };

  const conflict = gate.conflict;

  return (
    <div className="flex flex-1 flex-col gap-3 p-4 text-white">
      <div className="flex items-center justify-between">
        <p className="text-lg font-black">
          Entraram: <span className="text-emerald-400">{counts.entered}</span> de {counts.total}
        </p>
      </div>

      <QrScanner active={active && !result} onDecode={handleScan} />

      <TestCodesSheet onScan={handleScan} />

      {result && (
        <ResultOverlay
          result={result}
          onClose={() => setResult(null)}
          onConfirmDoc={() => setResult(null)}
          onRefuse={() => {
            if ("ticket" in result) gateActions.refuse(result.ticket);
            setResult(null);
          }}
        />
      )}

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-[#1B1024] p-6 text-white">
            <p className="text-xl font-black text-amber-300">Conflito de check-in</p>
            <p className="mt-2 text-sm font-semibold text-white/70">Ingresso {conflict.code} foi validado em mais de uma portaria:</p>
            <div className="mt-3 space-y-1 text-sm font-bold">
              {conflict.entries.map((e, i) => (
                <p key={i}>{e.at} — {e.gate}</p>
              ))}
            </div>
            <button
              type="button"
              onClick={() => gateActions.dismissConflict()}
              className="mt-5 h-12 w-full rounded-xl bg-violet-500 font-black"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
