import { useState } from "react";
import { QrScanner } from "@/components/portaria/qr-scanner";
import { ResultOverlay } from "@/components/portaria/result-overlay";
import { gateActions, getEnteredCounts, useGate, type ScanResult } from "@/lib/gate-store";

export function ScannerScreen({ active }: { active: boolean }) {
  useGate();
  const [result, setResult] = useState<ScanResult | null>(null);
  const counts = getEnteredCounts();

  const handleScan = async (code: string) => {
    if (result) return;
    const r = await gateActions.scanCode(code);
    if (r) setResult(r);
  };

  return (
    <div className="flex flex-1 flex-col gap-3 p-4 text-white">
      <div className="flex items-center justify-between">
        <p className="text-lg font-black">
          Entraram: <span className="text-emerald-400">{counts.entered}</span> de {counts.total}
        </p>
      </div>

      <QrScanner active={active && !result} onDecode={(code) => void handleScan(code)} />

      {result && (
        <ResultOverlay
          result={result}
          onClose={() => setResult(null)}
          onConfirmDoc={() => setResult(null)}
          onRefuse={() => setResult(null)}
        />
      )}
    </div>
  );
}
