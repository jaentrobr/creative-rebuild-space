import { useRef, useState } from "react";
import { z } from "zod";
import logo from "@/assets/entro-logo.png.asset.json";
import { gateActions, useGate } from "@/lib/gate-store";
import { db } from "@/integrations/meu-supabase/client";
import { Captcha, type CaptchaHandle } from "@/components/captcha";
import { CAPTCHA_ERROR } from "@/config/security";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Informe seu usuário"),
  password: z.string().min(1, "Informe sua senha"),
});

export function LoginScreen() {
  const gate = useGate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<CaptchaHandle>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }
    if (!captchaToken) {
      setError(CAPTCHA_ERROR);
      return;
    }
    setLoading(true);
    setError("");
    // Verifica o captcha diretamente com o Supabase antes de acionar o fluxo
    // de login da portaria (que não recebe token de captcha).
    const { error: captchaAuthError } = await db.auth.signInWithPassword({
      email: parsed.data.username,
      password: parsed.data.password,
      options: { captchaToken },
    });
    captchaRef.current?.reset();
    if (captchaAuthError) {
      setLoading(false);
      setError(/captcha/i.test(captchaAuthError.message) ? CAPTCHA_ERROR : "E-mail ou senha incorretos.");
      return;
    }
    await gateActions.login(parsed.data.username, parsed.data.password);
    setLoading(false);
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
          <Captcha ref={captchaRef} onToken={setCaptchaToken} className="flex justify-center" />
          {(error || gate.loginError) && (
            <p className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-300">
              {error || gate.loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="h-16 w-full rounded-2xl bg-violet-500 text-xl font-black text-white transition-opacity active:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
