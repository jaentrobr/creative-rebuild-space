import { QrCode, Search, History, ListChecks } from "lucide-react";

export type PortariaScreen = "scanner" | "manual" | "history" | "prepare";

const items: { key: PortariaScreen; label: string; icon: typeof QrCode }[] = [
  { key: "prepare", label: "Preparar", icon: ListChecks },
  { key: "scanner", label: "Leitor", icon: QrCode },
  { key: "manual", label: "Busca", icon: Search },
  { key: "history", label: "Histórico", icon: History },
];

export function NavBar({ screen, onChange }: { screen: PortariaScreen; onChange: (s: PortariaScreen) => void }) {
  return (
    <nav className="grid grid-cols-4 border-t border-white/10 bg-[#150C22]">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex flex-col items-center gap-1 py-3 text-xs font-bold ${screen === key ? "text-violet-300" : "text-white/50"}`}
        >
          <Icon className="size-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}
