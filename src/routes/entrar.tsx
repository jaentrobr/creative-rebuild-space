import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/ui/otp-input";
import { ProducerCta } from "@/components/producer-cta";
import { signIn } from "@/lib/session";
import { passwordRules, passwordStrength } from "@/lib/format";

const loginSchema = z.object({
  redirect: z.string().optional().catch("/"),
  event: z.string().optional().catch(""),
  total: z.coerce.number().optional().catch(0),
  half: z.coerce.boolean().optional().catch(false),
  ref: z.string().optional().catch(""),
});

export const Route = createFileRoute("/entrar")({
  validateSearch: (search) => loginSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Entrô" },
      { name: "description", content: "Acesse seus ingressos ou crie sua conta Entrô." },
      { property: "og:title", content: "Entrar — Entrô" },
      { property: "og:description", content: "Acesse seus ingressos na Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "forgot-email" | "forgot-code" | "forgot-password";

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const loginFormRef = useRef<HTMLFormElement>(null);
  const forgotFormRef = useRef<HTMLFormElement>(null);
  const resetFormRef = useRef<HTMLFormElement>(null);
  const redirectSearch = useMemo(
    () => ({
      event: search.event || "",
      total: search.total || 0,
      half: search.half || false,
      ref: search.ref || "",
    }),
    [search]
  );
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [countdown]);

  const redirectTo = () => {
    if (search.redirect === "/checkout" && search.event && search.total) {
      navigate({ to: "/checkout", search: redirectSearch as any });
    } else {
      navigate({ to: (search.redirect || "/") as "/" });
    }
  };

  const performLogin = () => {
    if (loading) return;
    setLoading(true);
    window.setTimeout(() => {
      signIn();
      setLoading(false);
      redirectTo();
    }, 800);
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    performLogin();
  };

  const sendForgotCode = (event: React.FormEvent) => {
    event.preventDefault();
    setCountdown(60);
  };

  const verifyForgotCode = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      if (value === "123456") {
        setMode("forgot-password");
        setError("");
      } else {
        setError("Código incorreto. Confira e tente de novo.");
      }
    }
  };

  const resetPassword = (event: React.FormEvent) => {
    event.preventDefault();
    const rules = passwordRules(newPassword);
    if (!Object.values(rules).every(Boolean)) {
      setError("A senha não atende a todos os requisitos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }
    setMode("login");
    setError("");
    setPassword(newPassword);
  };

  const strength = passwordStrength(newPassword);
  const rules = passwordRules(newPassword);

  return (
    <>
      <div className="wave-field min-h-[70vh] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
          {mode === "login" && (
            <>
              <h1 className="text-center text-3xl font-bold sm:text-4xl">Seu rolê tá aqui</h1>
              <form ref={loginFormRef} onSubmit={handleLogin} className="mt-6 grid gap-3">
                <Input required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div className="relative">
                  <Input required type={showPassword ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button type="button" disabled={loading} onClick={performLogin}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
              <div className="mt-4 flex flex-col gap-2 text-center text-sm">
                <button type="button" onClick={() => { setMode("forgot-email"); setError(""); }} className="font-semibold text-primary hover:underline">Esqueci minha senha</button>
                <p className="text-muted-foreground">
                  Não tem conta?{" "}
                  <Link to="/cadastro" search={{ redirect: search.redirect, ...redirectSearch } as any} className="font-semibold text-primary hover:underline">
                    Criar conta
                  </Link>
                </p>
              </div>
              <p className="mt-5 text-center text-xs text-muted-foreground">Login apenas demonstrativo, sem cadastro real.</p>
            </>
          )}

          {mode === "forgot-email" && (
            <>
              <button onClick={() => setMode("login")} className="text-sm font-semibold text-primary">← Voltar</button>
              <h1 className="mt-2 text-center text-3xl font-bold">Recuperar senha</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">Digite seu e-mail para receber o código de recuperação.</p>
              <form ref={forgotFormRef} onSubmit={sendForgotCode} className="mt-5 grid gap-3">
                <Input required type="email" placeholder="E-mail" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                <Button type="button" onClick={() => forgotFormRef.current?.requestSubmit()}>Enviar código</Button>
              </form>
              {countdown > 0 && <p className="mt-3 text-center text-xs text-muted-foreground">Reenviar em {countdown}s</p>}
            </>
          )}

          {mode === "forgot-code" && (
            <>
              <button onClick={() => setMode("forgot-email")} className="text-sm font-semibold text-primary">← Voltar</button>
              <h1 className="mt-2 text-center text-3xl font-bold">Verifique seu e-mail</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">Enviamos um código de 6 dígitos para {forgotEmail || "seu e-mail"}.</p>
              <p className="mt-2 text-center text-xs text-amber-600">Código de teste: 123456</p>
              <div className="mt-5 flex justify-center">
                <OTPInput value={code} onChange={verifyForgotCode} />
              </div>
              {error && <p className="mt-3 text-center text-sm font-semibold text-destructive">{error}</p>}
              <div className="mt-4 text-center text-sm">
                {countdown > 0 ? <p className="text-muted-foreground">Reenviar em {countdown}s</p> : <button onClick={() => setCountdown(60)} className="font-semibold text-primary hover:underline">Reenviar código</button>}
              </div>
            </>
          )}

          {mode === "forgot-password" && (
            <>
              <button onClick={() => setMode("forgot-code")} className="text-sm font-semibold text-primary">← Voltar</button>
              <h1 className="mt-2 text-center text-3xl font-bold">Crie uma nova senha</h1>
              <form ref={resetFormRef} onSubmit={resetPassword} className="mt-5 grid gap-3">
                <div className="relative">
                  <Input required type={showNewPassword ? "text" : "password"} placeholder="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowNewPassword((s) => !s)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Input required type={showNewPassword ? "text" : "password"} placeholder="Confirmar nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <PasswordChecklist rules={rules} strength={strength} />
                {error && <p className="text-center text-sm font-semibold text-destructive">{error}</p>}
                <Button type="button" onClick={() => resetFormRef.current?.requestSubmit()}>Redefinir senha</Button>
              </form>
            </>
          )}
        </div>
      </div>
      <ProducerCta />
    </>
  );
}

function PasswordChecklist({ rules, strength }: { rules: ReturnType<typeof passwordRules>; strength: ReturnType<typeof passwordStrength> }) {
  const items = [
    { key: "min8", label: "Mínimo de 8 caracteres" },
    { key: "upper", label: "Uma letra maiúscula" },
    { key: "lower", label: "Uma letra minúscula" },
    { key: "number", label: "Um número" },
    { key: "special", label: "Um caractere especial (! @ # $ %)" },
  ] as const;

  return (
    <div className="grid gap-2 rounded-xl bg-secondary p-3 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strength.level / 3) * 100}%` }} />
        </div>
        <span className="text-xs font-bold">{strength.label}</span>
      </div>
      <ul className="grid gap-1 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item.key} className={`flex items-center gap-2 ${rules[item.key] ? "text-foreground line-through" : ""}`}>
            <span className={`size-2 rounded-full ${rules[item.key] ? "bg-primary" : "bg-muted-foreground"}`} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
