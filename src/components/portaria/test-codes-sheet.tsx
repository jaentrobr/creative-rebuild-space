import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { testCodes } from "@/data/gate";

export function TestCodesSheet({ onScan }: { onScan: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="h-12 w-full rounded-2xl border-2 border-white/20 text-sm font-bold text-white/80"
        >
          Códigos de teste
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto border-t border-white/10 bg-[#150C22] text-white">
        <SheetHeader>
          <SheetTitle className="text-white">Códigos de teste</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {testCodes.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => {
                setOpen(false);
                onScan(t.code);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
            >
              <span>
                <span className="block font-black">{t.label}</span>
                <span className="block text-xs font-semibold text-white/50">{t.code}</span>
              </span>
              <span className="text-xs font-bold text-violet-300">Simular</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
