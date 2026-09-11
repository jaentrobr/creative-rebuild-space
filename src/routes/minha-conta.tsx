import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { demoUser } from "@/data/account";

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
  component: AccountPage,
});

function AccountPage() {
  const [saved, setSaved] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const save = (message: string) => (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(message);
  };

  return (
    <PageShell className="max-w-2xl">
      <h1 className="text-4xl font-bold sm:text-5xl">Minha conta</h1>
      {saved && <p className="mt-5 flex items-center gap-2 rounded-xl bg-secondary p-4 font-bold"><Check className="text-primary" /> {saved}</p>}

      <form onSubmit={save("Dados salvos na simulação.")} className="mt-7 grid gap-4 rounded-xl border border-border p-5">
        <h2 className="text-2xl font-bold">Dados pessoais</h2>
        <label className="grid gap-1 text-sm font-semibold">Nome<Input defaultValue={demoUser.name} /></label>
        <label className="grid gap-1 text-sm font-semibold">CPF<Input value={demoUser.cpf} disabled readOnly /><span className="text-xs font-normal text-muted-foreground">O CPF não pode ser alterado.</span></label>
        <label className="grid gap-1 text-sm font-semibold">E-mail<Input type="email" defaultValue={demoUser.email} /></label>
        <label className="grid gap-1 text-sm font-semibold">Celular<Input defaultValue={demoUser.phone} /></label>
        <Button type="submit" className="justify-self-start">Salvar dados</Button>
      </form>

      <form onSubmit={save("Senha alterada na simulação.")} className="mt-5 grid gap-4 rounded-xl border border-border p-5">
        <h2 className="text-2xl font-bold">Alterar senha</h2>
        <Input type="password" placeholder="Senha atual" required />
        <Input type="password" placeholder="Nova senha" required />
        <Input type="password" placeholder="Confirmar nova senha" required />
        <Button type="submit" variant="outline" className="justify-self-start">Alterar senha</Button>
      </form>

      <div className="mt-5 grid gap-4 rounded-xl border border-border p-5">
        <h2 className="text-2xl font-bold">Notificações</h2>
        <label className="flex items-center justify-between gap-4 text-sm font-semibold">
          Avisos por e-mail
          <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm font-semibold">
          Avisos por SMS
          <Switch checked={smsNotif} onCheckedChange={setSmsNotif} />
        </label>
      </div>
    </PageShell>
  );
}
