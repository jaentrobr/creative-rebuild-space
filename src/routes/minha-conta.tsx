import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { TEXT_LIMITS } from "@/config/security";
import { clearGateIndexedDb } from "@/lib/gate-store";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { db } from "@/integrations/meu-supabase/client";
import type { TablesInsert } from "@/integrations/meu-supabase/types";
import { maskCpf } from "@/lib/format";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — Entrô" },
      { name: "description", content: "Dados pessoais, senha e preferências de notificação." },
      { property: "og:title", content: "Minha conta — Entrô" },
      { property: "og:description", content: "Gerencie seus dados na Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AccountPage />
    </RequireAuth>
  ),
});

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe seu nome.")
    .max(TEXT_LIMITS.fullName, `O nome pode ter no máximo ${TEXT_LIMITS.fullName} caracteres.`),
});

function mapAuthError(error: { message?: string | null }): string {
  const normalized = (error.message ?? "").toLowerCase();
  if (normalized.includes("should be different"))
    return "A nova senha deve ser diferente da atual.";
  if (normalized.includes("password"))
    return "A senha não atende aos requisitos mínimos (mínimo 6 caracteres).";
  return friendlyError(error, "Não foi possível concluir. Tente novamente em instantes.");
}

function AccountPage() {
  const { user, profile, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [nameError, setNameError] = useState("");
  const [saved, setSaved] = useState("");
  const [name, setName] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? "");
    setEmailNotif(profile.notify_email ?? true);
  }, [profile]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setNameError("");
    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? "Nome inválido.");
      return;
    }
    setSavingProfile(true);
    const payload: TablesInsert<"profiles"> = {
      id: user.id,
      full_name: parsed.data.name,
    };
    const { error } = await db.from("profiles").upsert(payload);
    setSavingProfile(false);
    if (error) {
      toast.error(friendlyError(error, "Não foi possível salvar seus dados. Tente novamente."));
      return;
    }
    await refresh();
    setSaved("Dados salvos com sucesso.");
    toast.success("Dados atualizados.");
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não são iguais.");
      return;
    }
    setSavingPassword(true);
    const { error } = await db.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(mapAuthError(error));
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setSaved("Senha alterada com sucesso.");
    toast.success("Senha alterada.");
  };

  const toggleNotif = async (value: boolean) => {
    if (!user) return;
    setEmailNotif(value);
    const payload: TablesInsert<"profiles"> = { id: user.id, notify_email: value };
    const { error } = await db.from("profiles").upsert(payload);
    if (error) {
      toast.error(friendlyError(error, "Não foi possível salvar sua preferência."));
      return;
    }
    await refresh();
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
      await clearGateIndexedDb();
      void navigate({ to: "/" });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <PageShell className="max-w-2xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Minha conta</h1>
      {saved && (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-secondary p-4 font-bold">
          <Check className="text-primary" /> {saved}
        </p>
      )}

      <form onSubmit={saveProfile} className="mt-7 grid gap-4 rounded-xl border border-border p-5">
        <h2 className="text-2xl font-bold">Dados pessoais</h2>
        <label className="grid gap-1 text-sm font-semibold">
          Nome
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={TEXT_LIMITS.fullName}
            required
          />
          {nameError && <span className="text-xs font-semibold text-destructive">{nameError}</span>}
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          CPF
          <Input value={profile?.cpf ? maskCpf(profile.cpf) : "Não informado"} disabled readOnly />
          <span className="text-xs font-normal text-muted-foreground">
            O CPF não pode ser alterado.
          </span>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          E-mail
          <Input type="email" value={user?.email ?? ""} disabled readOnly />
          <span className="text-xs font-normal text-muted-foreground">
            A troca de e-mail ainda não está disponível.
          </span>
        </label>

        <Button type="submit" className="justify-self-start" disabled={savingProfile}>
          {savingProfile ? <Loader2 className="size-4 animate-spin" /> : "Salvar dados"}
        </Button>
      </form>

      <form
        onSubmit={changePassword}
        className="mt-5 grid gap-4 rounded-xl border border-border p-5"
      >
        <h2 className="text-2xl font-bold">Alterar senha</h2>
        <Input
          type="password"
          placeholder="Nova senha"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Confirmar nova senha"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {passwordError && <p className="text-sm font-semibold text-destructive">{passwordError}</p>}
        <Button
          type="submit"
          variant="outline"
          className="justify-self-start"
          disabled={savingPassword}
        >
          {savingPassword ? <Loader2 className="size-4 animate-spin" /> : "Alterar senha"}
        </Button>
      </form>

      <div className="mt-5 grid gap-4 rounded-xl border border-border p-5">
        <h2 className="text-2xl font-bold">Notificações</h2>
        <label className="flex items-center justify-between gap-4 text-sm font-semibold">
          Avisos por e-mail
          <Switch checked={emailNotif} onCheckedChange={(value) => void toggleNotif(value)} />
        </label>
      </div>

      <div className="mt-5 rounded-xl border border-border p-5">
        <Button type="button" variant="ghost" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : "Sair da conta"}
        </Button>
      </div>
    </PageShell>
  );
}
