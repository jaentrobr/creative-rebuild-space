import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/ui/otp-input";
import { Checkbox } from "@/components/ui/checkbox";
import { ProducerCta } from "@/components/producer-cta";
import { signIn } from "@/lib/session";
import { maskCpf, maskDate, maskPhone, passwordRules, passwordStrength, validateCpf, validateDate } from "@/lib/format";

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

type Step = 1 | 2 | 3 | 4 | "done";

function SignupPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectSearch = useMemo(
    () => ({
      event: search.event || "",
      total: search.total || 0,
      half: search.half || false,
      ref: search.ref || "",
    }),
    [search]
  );
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    birth: "",
    cpf: "",
    acceptedTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [countdown]);

  const rules = passwordRules(form.password);
  const strength = passwordStrength(form.password);
  const step1Valid = form.name.trim().length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && Object.values(rules).every(Boolean) && form.acceptedTerms;
  const step4Valid = validateDate(form.birth) && validateCpf(form.cpf);

  const redirectTo = () => {
    if (search.redirect === "/checkout" && search.event && search.total) {
      navigate({ to: "/checkout", search: redirectSearch as any });
    } else {
      navigate({ to: (search.redirect || "/") as "/" });
    }
  };

  const next = () => {
    if (step === 1 && !step1Valid) return;
    if (step === 4 && !step4Valid) return;
    if (step === 4) {
      setLoading(true);
      window.setTimeout(() => {
        signIn();
        setLoading(false);
        setStep("done");
        window.setTimeout(redirectTo, 2000);
      }, 800);
      return;
    }
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 4) as Step);
    setCountdown(0);
    setCode("");
    setPhoneCode("");
    setError("");
  };

  const back = () => {
    setStep((s) => (s === 2 ? 1 : s === 3 ? 2 : s === 4 ? 3 : 1) as Step);
    setError("");
  };

  const verifyEmailCode = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      if (value === "123456") {
        setError("");
      } else {
        setError("Código incorreto. Confira e tente de novo.");
      }
    }
  };

  const verifyPhoneCode = (value: string) => {
    setPhoneCode(value);
    if (value.length === 6) {
      if (value === "123456") {
        setError("");
      } else {
        setError("Código incorreto. Confira e tente de novo.");
      }
    }
  };

  const sendPhoneCode = () => setCountdown(60);

  return (
    <>
      <div className="wave-field min-h-[70vh] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
          {step !== "done" && (
            <div className="mb-5 flex items-center justify-between">
              <button onClick={back} className="flex items-center gap-1 text-sm font-semibold text-primary disabled:opacity-50" disabled={step === 1}>
                <ArrowLeft className="size-4" /> Voltar
              </button>
              <span className="text-xs font-bold text-muted-foreground">Etapa {step} de 4</span>
            </div>
          )}

          <div className="mb-6 flex gap-2">
            {[1, 2, 3, 4].map((value) => (
              <div key={value} className={`h-2 flex-1 rounded-full ${(step === "done" ? 4 : step) >= value ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="text-center text-3xl font-bold">Seus dados</h1>
              <form onSubmit={(e) => { e.preventDefault(); next(); }} className="mt-5 grid gap-3">
                <Input required placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <div className="relative">
                  <Input required type={showPassword ? "text" : "password"} placeholder="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <PasswordChecklist rules={rules} strength={strength} />
                <label className="flex items-start gap-2 text-sm leading-tight">
                  <Checkbox checked={form.acceptedTerms} onCheckedChange={(checked) => setForm({ ...form, acceptedTerms: checked === true })} />
                  <span>
                    Li e aceito os <Link to="/termos" className="font-semibold text-primary hover:underline">Termos de uso</Link> e a <Link to="/privacidade" className="font-semibold text-primary hover:underline">Política de privacidade</Link>.
                  </span>
                </label>
                <Button type="submit" disabled={!step1Valid}>Continuar</Button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-center text-3xl font-bold">Confirme seu e-mail</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">Enviamos um código de 6 dígitos para {form.email || "seu e-mail"}.</p>
              <p className="mt-2 text-center text-xs text-amber-600">Código de teste: 123456</p>
              <div className="mt-5 flex justify-center">
                <OTPInput value={code} onChange={verifyEmailCode} />
              </div>
              {error && <p className="mt-3 text-center text-sm font-semibold text-destructive">{error}</p>}
              <div className="mt-4 text-center text-sm">
                {countdown > 0 ? <p className="text-muted-foreground">Reenviar em {countdown}s</p> : <button onClick={() => setCountdown(60)} className="font-semibold text-primary hover:underline">Reenviar código</button>}
              </div>
              <button onClick={() => setStep(1)} className="mt-4 block w-full text-center text-sm font-semibold text-primary hover:underline">Trocar e-mail</button>
              <Button className="mt-5 w-full" onClick={next} disabled={code !== "123456"}>Continuar</Button>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-center text-3xl font-bold">Confirme seu celular</h1>
              {!countdown && phoneCode.length < 6 ? (
                <>
                  <p className="mt-2 text-center text-sm text-muted-foreground">Digite seu número com DDD.</p>
                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
                    <span className="text-sm font-semibold text-muted-foreground">+55</span>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" className="border-0 shadow-none focus-visible:ring-0" />
                  </div>
                  <Button className="mt-4 w-full" onClick={sendPhoneCode} disabled={form.phone.replace(/\D/g, "").length < 11}>Enviar código</Button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-center text-sm text-muted-foreground">Enviamos um SMS para +55 {form.phone}.</p>
                  <p className="mt-2 text-center text-xs text-amber-600">Código de teste: 123456</p>
                  <div className="mt-5 flex justify-center">
                    <OTPInput value={phoneCode} onChange={verifyPhoneCode} />
                  </div>
                  {error && <p className="mt-3 text-center text-sm font-semibold text-destructive">{error}</p>}
                  <div className="mt-4 text-center text-sm">
                    {countdown > 0 ? <p className="text-muted-foreground">Reenviar em {countdown}s</p> : <button onClick={() => setCountdown(60)} className="font-semibold text-primary hover:underline">Reenviar código</button>}
                  </div>
                  <button onClick={() => { setPhoneCode(""); setCountdown(0); }} className="mt-4 block w-full text-center text-sm font-semibold text-primary hover:underline">Trocar número</button>
                </>
              )}
              <Button className="mt-5 w-full" onClick={next} disabled={phoneCode !== "123456"}>Continuar</Button>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="text-center text-3xl font-bold">Finalize seu cadastro</h1>
              <form onSubmit={(e) => { e.preventDefault(); next(); }} className="mt-5 grid gap-3">
                <Input value={form.birth} onChange={(e) => setForm({ ...form, birth: maskDate(e.target.value) })} placeholder="Data de nascimento (DD/MM/AAAA)" maxLength={10} />
                {form.birth.length === 10 && !validateDate(form.birth) && <p className="text-xs font-semibold text-destructive">Data inválida.</p>}
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} placeholder="CPF" maxLength={14} />
                {form.cpf.length === 14 && !validateCpf(form.cpf) && <p className="text-xs font-semibold text-destructive">CPF inválido. Confira os números.</p>}
                <Button type="submit" disabled={!step4Valid || loading}>
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
              <h1 className="mt-6 text-3xl font-bold">Cadastro concluído!</h1>
              <p className="mt-2 text-lg text-muted-foreground">Bora pro rolê?</p>
              <Confetti />
            </div>
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
