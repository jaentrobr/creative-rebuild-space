import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProducerCta } from "@/components/producer-cta";
import { db } from "@/integrations/meu-supabase/client";

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

/** Traduz os erros mais comuns do Supabase Auth para português. */
function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (normalized.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (normalized.includes("rate limit"))
    return "Muitas tentativas. Aguarde um momento e tente de novo.";
  if (normalized.includes("user not found")) return "Não encontramos uma conta com esse e-mail.";
  return "Não foi possível concluir. Tente novamente em instantes.";
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
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

  const redirectTo = () => {
    if (search.redirect === "/checkout" && search.event && search.total) {
      navigate({ to: "/checkout", search: redirectSearch as any });
    } else {
      navigate({ to: (search.redirect || "/") as "/" });
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const { error: authError } = await db.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(mapAuthError(authError.message));
      return;
    }
    redirectTo();
  };

  const sendResetEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const { error: authError } = await db.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/minha-conta`,
    });
    setLoading(false);
    if (authError) {
      setError(mapAuthError(authError.message));
      return;
    }
    setForgotSent(true);
    toast.success("Enviamos um e-mail com o link para redefinir sua senha.");
  };

  return (
    <>
      <div className="wave-field min-h-[70vh] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
          {mode === "login" && (
            <>
              <h1 className="text-center text-3xl font-bold sm:text-4xl">Seu rolê tá aqui</h1>
              <form onSubmit={handleLogin} className="mt-6 grid gap-3">
                <Input
                  required
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                {error && (
                  <p className="text-center text-sm font-semibold text-destructive">{error}</p>
                )}
                <Button type="submit" disabled={loading}>
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
                    search={{ redirect: search.redirect, ...redirectSearch } as any}
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
                  Se {forgotEmail} tiver uma conta na Entrô, enviamos um e-mail com o link para
                  redefinir sua senha. Abra o link e você poderá criar uma nova senha em "Minha
                  conta".
                </p>
              ) : (
                <>
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    Digite seu e-mail para receber o link de redefinição de senha.
                  </p>
                  <form onSubmit={sendResetEmail} className="mt-5 grid gap-3">
                    <Input
                      required
                      type="email"
                      placeholder="E-mail"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                    {error && (
                      <p className="text-center text-sm font-semibold text-destructive">{error}</p>
                    )}
                    <Button type="submit" disabled={loading}>
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
