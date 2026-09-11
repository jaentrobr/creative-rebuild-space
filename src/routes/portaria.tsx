import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/entro-logo.png.asset.json";
import { LoginScreen } from "@/components/portaria/login-screen";
import { PrepareScreen } from "@/components/portaria/prepare-screen";
import { ScannerScreen } from "@/components/portaria/scanner-screen";
import { ManualSearch } from "@/components/portaria/manual-search";
import { HistoryScreen } from "@/components/portaria/history-screen";
import { StatusBar } from "@/components/portaria/status-bar";
import { NavBar, type PortariaScreen } from "@/components/portaria/nav-bar";
import { ResultOverlay } from "@/components/portaria/result-overlay";
import { PwaInstallHint } from "@/components/pwa-install-hint";
import { gateActions, useGate, type ScanResult } from "@/lib/gate-store";

export const Route = createFileRoute("/portaria")({
  head: () => ({
    meta: [
      { title: "Portaria | Entrô" },
      {
        name: "description",
        content: "Leitor de QR Code e controle de entrada para a equipe de portaria da Entrô.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortariaPage,
});

function PortariaPage() {
  const gate = useGate();
  const [screen, setScreen] = useState<PortariaScreen>("prepare");
  const [manualResult, setManualResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (gate.signedIn && gate.downloaded && screen === "prepare") {
      // stay on prepare until user chooses to open scanner
    }
  }, [gate.signedIn]);

  if (!gate.signedIn) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0E0717] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <img src={logo.url} alt="Entrô" className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => gateActions.logout()}
          className="text-sm font-bold text-white/60 underline"
        >
          Sair
        </button>
      </div>

      <StatusBar />

      <div className="px-4 pt-3">
        <PwaInstallHint />
      </div>

      <div className="flex flex-1 flex-col">
        {screen === "prepare" && <PrepareScreen onOpenScanner={() => setScreen("scanner")} />}
        {screen === "scanner" && <ScannerScreen active={screen === "scanner"} />}
        {screen === "manual" && <ManualSearch onResult={setManualResult} />}
        {screen === "history" && <HistoryScreen />}
      </div>

      {manualResult && (
        <ResultOverlay result={manualResult} onClose={() => setManualResult(null)} />
      )}

      {gate.logoutBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-[#1B1024] p-6 text-white">
            <p className="text-lg font-black text-rose-400">Não é possível sair</p>
            <p className="mt-2 text-sm font-semibold text-white/70">{gate.logoutBlocked}</p>
            <button
              type="button"
              onClick={() => gateActions.dismissLogoutBlocked()}
              className="mt-5 h-12 w-full rounded-xl bg-violet-500 font-black"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      <NavBar screen={screen} onChange={setScreen} />
    </div>
  );
}
