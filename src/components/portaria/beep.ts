let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

function tone(freq: number, duration: number, delay = 0) {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.2, audio.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(audio.currentTime + delay);
  osc.stop(audio.currentTime + delay + duration);
}

export function playBeep(kind: "granted" | "warning" | "denied") {
  try {
    if (kind === "granted") tone(880, 0.15);
    else if (kind === "warning") {
      tone(660, 0.12);
      tone(660, 0.12, 0.18);
    } else {
      tone(220, 0.28);
    }
    navigator.vibrate?.(
      kind === "granted" ? 80 : kind === "warning" ? [60, 60, 60] : [200, 80, 200],
    );
  } catch {}
}
