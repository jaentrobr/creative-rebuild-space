/**
 * Exige verificação em duas etapas (TOTP) para acessar o /admin.
 * - Sem fator cadastrado: obriga o cadastro (QR code + código secreto).
 * - Com fator cadastrado mas sessão em aal1: pede o código de 6 dígitos.
 * - Só libera o conteúdo quando currentLevel === "aal2".
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { db } from "@/integrations/meu-supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { friendlyError } from "@/lib/friendly-error";

type Step = "loading" | "ready" | "enroll" | "challenge";

export function AdminMfaGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setError(null);
    const { data: aal, error: aalError } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      setError(friendlyError(aalError));
      setStep("challenge");
      return;
    }
    if (aal.currentLevel === "aal2") {
      setStep("ready");
      return;
    }
    const { data: factors, error: factorsError } = await db.auth.mfa.listFactors();
    if (factorsError) {
      setError(friendlyError(factorsError));
      setStep("challenge");
      return;
    }
    const verified = factors.totp.find((f) => f.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setStep("challenge");
    } else {
      setStep("enroll");
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const startEnroll = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: enrollError } = await db.auth.mfa.enroll({ factorType: "totp" });
      if (enrollError) throw enrollError;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (e) {
      setError(friendlyError(e as { message?: string }, "Não foi possível iniciar o cadastro do segundo fator."));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (step === "enroll" && !qrCode && !busy) {
      void startEnroll();
    }
  }, [step, qrCode, busy, startEnroll]);

  const confirmCode = async () => {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const { data: challenge, error: challengeError } = await db.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await db.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      setCode("");
      await checkStatus();
    } catch (e) {
      setError(friendlyError(e as { message?: string }, "Código inválido. Confira e tente de novo."));
    } finally {
      setBusy(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-16">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (step === "ready") return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-4 py-16">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-6 text-primary" />
        <h1 className="font-display text-xl font-extrabold">
          {step === "enroll" ? "Ative a verificação em duas etapas" : "Verificação em duas etapas"}
        </h1>
      </div>

      {step === "enroll" ? (
        <>
          <p className="text-sm text-muted-foreground">
            O acesso ao admin exige um segundo fator. Escaneie o QR code com um aplicativo
            autenticador (Google Authenticator, Authy etc.) ou digite o código secreto
            manualmente.
          </p>
          {busy && !qrCode ? (
            <Skeleton className="mx-auto h-48 w-48" />
          ) : qrCode ? (
            <img src={qrCode} alt="QR code para configurar a verificação em duas etapas" className="mx-auto size-48 rounded-lg border-2 border-foreground bg-white p-2" />
          ) : null}
          {secret ? (
            <p className="break-all rounded-lg bg-muted p-3 text-center text-sm font-mono">
              {secret}
            </p>
          ) : null}
          <p className="text-sm font-semibold">Digite o código de 6 dígitos gerado pelo app:</p>
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={busy || code.length !== 6 || !factorId} onClick={confirmCode}>
            {busy ? "Confirmando…" : "Confirmar e ativar"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Digite o código de 6 dígitos do seu aplicativo autenticador para continuar.
          </p>
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={busy || code.length !== 6 || !factorId} onClick={confirmCode}>
            {busy ? "Verificando…" : "Confirmar código"}
          </Button>
        </>
      )}
    </div>
  );
}
