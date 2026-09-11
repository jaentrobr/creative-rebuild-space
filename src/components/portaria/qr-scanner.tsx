import { useEffect, useRef, useState } from "react";

type Props = {
  onDecode: (code: string) => void;
  active: boolean;
};

/** Leitor de QR Code full-screen. Só roda no navegador (html5-qrcode acessa a câmera). */
export function QrScanner({ onDecode, active }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    let cancelled = false;
    let instance: any;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !ref.current) return;
        instance = new Html5Qrcode(ref.current.id, { verbose: false });
        scannerRef.current = instance;
        await instance.start(
          { facingMode: facing },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text: string) => onDecode(text),
          () => {},
        );
      } catch {
        setError("Não foi possível acessar a câmera. Use a busca manual ou os códigos de teste.");
      }
    })();
    return () => {
      cancelled = true;
      try {
        instance
          ?.stop?.()
          .then(() => instance.clear())
          .catch(() => {});
      } catch {
        try {
          instance?.clear?.();
        } catch {
          /* leitor já estava parado */
        }
      }
    };
  }, [active, facing]);

  const toggleTorch = async () => {
    try {
      await scannerRef.current?.applyVideoConstraints?.({ advanced: [{ torch: !torchOn }] });
      setTorchOn((t) => !t);
    } catch {
      setTorchOn((t) => !t);
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden rounded-3xl bg-black">
      <div
        id="portaria-qr-reader"
        ref={ref}
        className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 text-center text-lg font-semibold text-white">
          {error}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="size-56 rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
        <button
          type="button"
          onClick={toggleTorch}
          className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur"
        >
          {torchOn ? "Desligar lanterna" : "Lanterna"}
        </button>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur"
        >
          Trocar câmera
        </button>
      </div>
    </div>
  );
}
