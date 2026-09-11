import { useState } from "react";
import logo from "@/assets/entro-logo.png.asset.json";
import { gateActions, useGate } from "@/lib/gate-store";

export function LoginScreen() {
  const gate = useGate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    gateActions.login(username, password);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0E0717] px-6 py-10 text-white">
      <img src={logo.url} alt="Entrô" className="h-14 w-auto" />
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black">Portaria</h1>
          <p className="mt-1 text-white/60">Entre com seu usuário de portaria</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            autoComplete="username"
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-16 w-full rounded-2xl border-2 border-white/15 bg-white/5 px-5 text-lg font-semibold text-white placeholder:text-white/40 focus:border-violet-400 focus:outline-none"
          />
          <input
            autoComplete="current-password"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-16 w-full rounded-2xl border-2 border-white/15 bg-white/5 px-5 text-lg font-semibold text-white placeholder:text-white/40 focus:border-violet-400 focus:outline-none"
          />
          {gate.loginError && (
            <p className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-300">
              {gate.loginError}
            </p>
          )}
          <button
            type="submit"
            className="h-16 w-full rounded-2xl bg-violet-500 text-xl font-black text-white active:bg-violet-600"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
