import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProducerCta } from "@/components/producer-cta";
import { db } from "@/integrations/meu-supabase/client";
import { Captcha, type CaptchaHandle } from "@/components/captcha";
import { CAPTCHA_ERROR } from "@/config/security";
import { NEUTRAL_RESET_MESSAGE } from "@/lib/friendly-error";
import { safeInternalPath } from "@/lib/safe-url";

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

type Mode = "login" | "forgot";

const emailSchema = z.string().trim().min(1, "Informe seu e-mail").email("E-mail inválido");
const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha"),
});

function isCaptchaError(message: string): boolean {
  return /captcha/i.test(message);
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const safeRedirect = safeInternalPath(search.redirect, "/");
  const redirectSearch = useMemo(
    () => ({
      event: search.event || "",
      total: search.total || 0,
      half: search.half || false,
      ref: search.ref || "",
    }),
    [search],
  );
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<CaptchaHandle>(null);
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState("");
  const forgotCaptchaRef = useRef<CaptchaHandle>(null);

  const redirectTo = () => {
    if (safeRedirect === "/checkout" && search.event && search.total) {
      navigate({ to: "/checkout", search: redirectSearch });
    } else {
      navigate({ to: safeRedirect as "/" });
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (!captchaToken) {
      setError(CAPTCHA_ERROR);
      return;
    }
    setLoading(true);
    setError("");
    const { error: authError } = await db.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { captchaToken },
    });
    captchaRef.current?.reset();
    setLoading(false);
    if (authError) {
      setError(isCaptchaError(authError.message) ? CAPTCHA_ERROR : "E-mail ou senha incorretos.");
      return;
    }
    redirectTo();
  };

  const sendResetEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const parsed = emailSchema.safeParse(forgotEmail);
    if (!parsed.success) {
      setFieldErrors({ forgotEmail: parsed.error.issues[0]?.message ?? "E-mail inválido" });
      return;
    }
    setFieldErrors({});
    if (!forgotCaptchaToken) {
      setError(CAPTCHA_ERROR);
      return;
    }
    setLoading(true);
    setError("");
    const { error: authError } = await db.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/minha-conta`,
      captchaToken: forgotCaptchaToken,
    });
    forgotCaptchaRef.current?.reset();
    setLoading(false);
    if (authError && isCaptchaError(authError.message)) {
      setError(CAPTCHA_ERROR);
      return;
    }
    // Nunca revela se o e-mail existe, mesmo em caso de erro.
    setForgotSent(true);
  };

  return (
    <>
      <div className="wave-field min-h-[70vh] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
          {mode === "login" && (
            <>
              <h1 className="text-center text-3xl font-bold sm:text-4xl">Seu rolê tá aqui</h1>
              <form onSubmit={handleLogin} className="mt-6 grid gap-3">
                <div>
                  <Input
                    required
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {fieldErrors["email"] && (
                    <p className="mt-1 text-xs font-semibold text-destructive">
                      {fieldErrors["email"]}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Captcha ref={captchaRef} onToken={setCaptchaToken} />
                {error && (
                  <p className="text-center text-sm font-semibold text-destructive">{error}</p>
                )}
                <Button type="submit" disabled={loading || !captchaToken}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
              <div className="mt-4 flex flex-col gap-2 text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setForgotSent(false);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
                <p className="text-muted-foreground">
                  Não tem conta?{" "}
                  <Link
                    to="/cadastro"
                    search={{ redirect: search.redirect, ...redirectSearch }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Criar conta
                  </Link>
                </p>
              </div>
            </>
          )}

          {mode === "forgot" && (
            <>
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="text-sm font-semibold text-primary"
              >
                ← Voltar
              </button>
              <h1 className="mt-2 text-center text-3xl font-bold">Recuperar senha</h1>
              {forgotSent ? (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {NEUTRAL_RESET_MESSAGE}. Abra o link e você poderá criar uma nova senha em "Minha
                  conta".
                </p>
              ) : (
                <>
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    Digite seu e-mail para receber o link de redefinição de senha.
                  </p>
                  <form onSubmit={sendResetEmail} className="mt-5 grid gap-3">
                    <div>
                      <Input
                        required
                        type="email"
                        placeholder="E-mail"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                      {fieldErrors["forgotEmail"] && (
                        <p className="mt-1 text-xs font-semibold text-destructive">
                          {fieldErrors["forgotEmail"]}
                        </p>
                      )}
                    </div>
                    <Captcha ref={forgotCaptchaRef} onToken={setForgotCaptchaToken} />
                    {error && (
                      <p className="text-center text-sm font-semibold text-destructive">{error}</p>
                    )}
                    <Button type="submit" disabled={loading || !forgotCaptchaToken}>
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Enviar link de redefinição"
                      )}
                    </Button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <ProducerCta />
    </>
  );
}
