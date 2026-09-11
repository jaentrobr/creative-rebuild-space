import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ProducerCta } from "@/components/producer-cta";
import { db } from "@/integrations/meu-supabase/client";
import { Captcha, type CaptchaHandle } from "@/components/captcha";
import { CAPTCHA_ERROR, TEXT_LIMITS } from "@/config/security";
import { friendlyError } from "@/lib/friendly-error";
import { safeInternalPath } from "@/lib/safe-url";
import {
  maskCpf,
  maskDate,
  passwordRules,
  passwordStrength,
  validateCpf,
  validateDate,
} from "@/lib/format";

const signupSchema = z.object({
  redirect: z.string().optional().catch("/"),
  event: z.string().optional().catch(""),
  total: z.coerce.number().optional().catch(0),
  half: z.coerce.boolean().optional().catch(false),
  ref: z.string().optional().catch(""),
});

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search) => signupSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Criar conta — Entrô" },
      { name: "description", content: "Cadastre-se na Entrô em poucos passos." },
      { property: "og:title", content: "Criar conta — Entrô" },
      { property: "og:description", content: "Faça parte da Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

type Step = 1 | 2 | 3 | "done";

const step1Schema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo")
    .max(TEXT_LIMITS.fullName, `Máximo de ${TEXT_LIMITS.fullName} caracteres`),
  email: z.string().trim().min(1, "Informe seu e-mail").email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

function isAdultBirthDate(value: string): boolean {
  const parts = value.split("/");
  if (parts.length !== 3) return false;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  const date = new Date(year, month - 1, day);
  const now = new Date();
  if (date.getTime() > now.getTime()) return false;
  const sixteenYearsAgo = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
  return date.getTime() <= sixteenYearsAgo.getTime();
}

const step3Schema = z.object({
  cpf: z.string().refine(validateCpf, "CPF inválido. Confira os números."),
  birth: z
    .string()
    .refine(validateDate, "Data inválida.")
    .refine(isAdultBirthDate, "Você precisa ter pelo menos 16 anos e a data não pode ser futura."),
});

/** Converte DD/MM/AAAA em AAAA-MM-DD para gravar no banco. */
function toIsoDate(value: string): string | null {
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}`;
}

function SignupPage() {
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
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    birth: "",
    cpf: "",
    acceptedTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);

  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<CaptchaHandle>(null);

  const [resendCaptchaToken, setResendCaptchaToken] = useState("");
  const resendCaptchaRef = useRef<CaptchaHandle>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const rules = passwordRules(form.password);
  const strength = passwordStrength(form.password);
  const step1Parsed = step1Schema.safeParse(form);
  const step1Valid = step1Parsed.success && Object.values(rules).every(Boolean) && form.acceptedTerms;
  const step3Parsed = step3Schema.safeParse(form);
  const step3Valid = step3Parsed.success;

  const redirectTo = () => {
    if (safeRedirect === "/checkout" && search.event && search.total) {
      navigate({ to: "/checkout", search: redirectSearch });
    } else {
      navigate({ to: safeRedirect as "/" });
    }
  };

  const finishSignup = async () => {
    if (loading) return;
    if (!captchaToken) {
      setError(CAPTCHA_ERROR);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: signUpError } = await db.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: form.name.trim() },
        captchaToken,
      },
    });
    captchaRef.current?.reset();
    if (signUpError) {
      setLoading(false);
      setError(friendlyError(signUpError));
      return;
    }

    const userId = data.user?.id;
    if (data.session && userId) {
      const { error: profileError } = await db.from("profiles").upsert({
        id: userId,
        full_name: form.name.trim(),
        cpf: form.cpf.replace(/\D/g, "") || null,
        birth_date: toIsoDate(form.birth),
        notify_email: true,
        onboarding_completed_at: new Date().toISOString(),
      });
      if (profileError) {
        toast.error(
          "Cadastro criado, mas não conseguimos salvar todos os seus dados. Ajuste em Minha conta.",
        );
      }
      setLoading(false);
      setStep("done");
      window.setTimeout(redirectTo, 2000);
    } else {
      // Confirmação de e-mail habilitada: ainda não há sessão para gravar o perfil
      // (a RLS de profiles exige um usuário autenticado). CPF e data de nascimento
      // deverão ser preenchidos em "Minha conta" após a confirmação do e-mail.
      setLoading(false);
      setPendingEmailConfirmation(true);
      setStep("done");
    }
  };

  const resendConfirmation = async () => {
    if (resending) return;
    if (!resendCaptchaToken) {
      setResendMessage(CAPTCHA_ERROR);
      return;
    }
    setResending(true);
    setResendMessage("");
    const { error: resendError } = await db.auth.resend({
      type: "signup",
      email: form.email.trim(),
      options: { captchaToken: resendCaptchaToken },
    });
    resendCaptchaRef.current?.reset();
    setResending(false);
    if (resendError) {
      setResendMessage(friendlyError(resendError));
      return;
    }
    setResendMessage("Reenviamos o e-mail de confirmação.");
  };

  const next = () => {
    if (step === 1) {
      if (!step1Parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of step1Parsed.error.issues) {
          errors[String(issue.path[0])] = issue.message;
        }
        setFieldErrors(errors);
        return;
      }
      if (!step1Valid) return;
      setFieldErrors({});
    }
    if (step === 3) {
      if (!step3Parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of step3Parsed.error.issues) {
          errors[String(issue.path[0])] = issue.message;
        }
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      void finishSignup();
      return;
    }
    setStep((s) => (s === 1 ? 2 : 3) as Step);
    setError("");
  };

  const back = () => {
    setStep((s) => (s === 3 ? 2 : 1) as Step);
    setError("");
  };

  return (
    <>
      <div className="wave-field min-h-[70vh] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
          {step !== "done" && (
            <div className="mb-5 flex items-center justify-between">
              <button
                onClick={back}
                className="flex items-center gap-1 text-sm font-semibold text-primary disabled:opacity-50"
                disabled={step === 1}
              >
                <ArrowLeft className="size-4" /> Voltar
              </button>
              <span className="text-xs font-bold text-muted-foreground">Etapa {step} de 3</span>
            </div>
          )}

          <div className="mb-6 flex gap-2">
            {[1, 2, 3].map((value) => (
              <div
                key={value}
                className={`h-2 flex-1 rounded-full ${(step === "done" ? 3 : step) >= value ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="text-center text-3xl font-bold">Seus dados</h1>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
                className="mt-5 grid gap-3"
              >
                <div>
                  <Input
                    required
                    maxLength={TEXT_LIMITS.fullName}
                    placeholder="Nome completo"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {fieldErrors["name"] && (
                    <p className="mt-1 text-xs font-semibold text-destructive">
                      {fieldErrors["name"]}
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    required
                    type="email"
                    placeholder="E-mail"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                <PasswordChecklist rules={rules} strength={strength} />
                <label className="flex items-start gap-2 text-sm leading-tight">
                  <Checkbox
                    checked={form.acceptedTerms}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, acceptedTerms: checked === true })
                    }
                  />
                  <span>
                    Li e aceito os{" "}
                    <Link to="/termos" className="font-semibold text-primary hover:underline">
                      Termos de uso
                    </Link>{" "}
                    e a{" "}
                    <Link to="/privacidade" className="font-semibold text-primary hover:underline">
                      Política de privacidade
                    </Link>
                    .
                  </span>
                </label>
                <Captcha ref={captchaRef} onToken={setCaptchaToken} />
                {error && (
                  <p className="text-center text-sm font-semibold text-destructive">{error}</p>
                )}
                <Button type="submit" disabled={!step1Valid || !captchaToken}>
                  Continuar
                </Button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-center text-3xl font-bold">Confirmação de e-mail</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Ao concluir seu cadastro, enviaremos um e-mail de confirmação para{" "}
                <strong>{form.email || "seu e-mail"}</strong>. Você poderá entrar normalmente após
                confirmar.
              </p>
              <Button className="mt-5 w-full" onClick={next}>
                Continuar
              </Button>
              <div className="mt-4 grid gap-2 rounded-xl bg-secondary p-3">
                <p className="text-center text-xs text-muted-foreground">
                  Não recebeu o e-mail de confirmação? Você pode reenviar após concluir o cadastro.
                </p>
                <Captcha ref={resendCaptchaRef} onToken={setResendCaptchaToken} />
                {resendMessage && (
                  <p className="text-center text-xs font-semibold text-destructive">
                    {resendMessage}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={resending || !resendCaptchaToken}
                  onClick={resendConfirmation}
                >
                  {resending ? <Loader2 className="size-4 animate-spin" /> : "Reenviar e-mail"}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-center text-3xl font-bold">Finalize seu cadastro</h1>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
                className="mt-5 grid gap-3"
              >
                <div>
                  <Input
                    value={form.birth}
                    onChange={(e) => setForm({ ...form, birth: maskDate(e.target.value) })}
                    placeholder="Data de nascimento (DD/MM/AAAA)"
                    maxLength={10}
                  />
                  {form.birth.length === 10 && !validateDate(form.birth) && (
                    <p className="mt-1 text-xs font-semibold text-destructive">Data inválida.</p>
                  )}
                  {form.birth.length === 10 &&
                    validateDate(form.birth) &&
                    !isAdultBirthDate(form.birth) && (
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        Você precisa ter pelo menos 16 anos.
                      </p>
                    )}
                </div>
                <div>
                  <Input
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
                    placeholder="CPF"
                    maxLength={14}
                  />
                  {form.cpf.length === 14 && !validateCpf(form.cpf) && (
                    <p className="mt-1 text-xs font-semibold text-destructive">
                      CPF inválido. Confira os números.
                    </p>
                  )}
                </div>
                {error && (
                  <p className="text-center text-sm font-semibold text-destructive">{error}</p>
                )}
                <Button type="submit" disabled={!step3Valid || loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Concluir cadastro"}
                </Button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="py-8 text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-10" />
              </div>
              {pendingEmailConfirmation ? (
                <>
                  <h1 className="mt-6 text-3xl font-bold">Confirme seu e-mail</h1>
                  <p className="mt-2 text-lg text-muted-foreground">
                    Enviamos um link de confirmação para {form.email}. Abra-o para ativar sua conta
                    e depois complete seus dados em "Minha conta".
                  </p>
                </>
              ) : (
                <>
                  <h1 className="mt-6 text-3xl font-bold">Cadastro concluído!</h1>
                  <p className="mt-2 text-lg text-muted-foreground">Bora pro rolê?</p>
                  <Confetti />
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <ProducerCta />
    </>
  );
}

function PasswordChecklist({
  rules,
  strength,
}: {
  rules: ReturnType<typeof passwordRules>;
  strength: ReturnType<typeof passwordStrength>;
}) {
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
          <div
            className={`h-full ${strength.color} transition-all`}
            style={{ width: `${(strength.level / 3) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold">{strength.label}</span>
      </div>
      <ul className="grid gap-1 text-xs text-muted-foreground">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-2 ${rules[item.key] ? "text-foreground line-through" : ""}`}
          >
            <span
              className={`size-2 rounded-full ${rules[item.key] ? "bg-primary" : "bg-muted-foreground"}`}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 h-2 w-2 animate-[confetti_1.5s_ease-out_forwards] rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: ["#a855f7", "#f97316", "#facc15", "#3b82f6"][i % 4],
            animationDelay: `${Math.random() * 0.5}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}
