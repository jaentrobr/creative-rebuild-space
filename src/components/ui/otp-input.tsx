import { useRef } from "react";

export function OTPInput({ value, onChange, length = 6 }: { value: string; onChange: (value: string) => void; length?: number }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const setRef = (index: number) => (el: HTMLInputElement | null) => {
    inputsRef.current[index] = el;
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[index] = digit;
    const joined = next.slice(0, length).join("").replace(/undefined/g, "");
    onChange(joined);
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    if (joined.length === length) {
      onChange(joined);
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      const next = value.split("");
      next.splice(index - 1, 1);
      onChange(next.join(""));
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(text);
    if (text.length === length) {
      inputsRef.current[length - 1]?.focus();
    } else if (text.length > 0) {
      inputsRef.current[text.length]?.focus();
    }
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={setRef(index)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] ?? ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          className="size-11 rounded-xl border border-input bg-background text-center text-xl font-bold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring sm:size-12"
          aria-label={`Dígito ${index + 1}`}
        />
      ))}
    </div>
  );
}
