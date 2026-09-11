import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/entro-logo.png.asset.json";
import { NotFoundState } from "@/components/not-found-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/data/admin";
import { adminActions, useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Entrô" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminGate,
});

function AdminGate() {
  const { signedIn } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);

  if (!signedIn && !revealed) {
    return (
      <div className="relative min-h-screen">
        <NotFoundState />
        <button
          type="button"
          aria-label="Acesso interno"
          onClick={() => setRevealed(true)}
          className="fixed bottom-3 right-3 size-10 rounded-full opacity-0"
        />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <form
          className="w-full max-w-sm rounded-2xl border-2 border-foreground bg-background p-6 shadow-pop"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
              setError("");
              adminActions.signIn();
            } else {
              setError("E-mail ou senha inválidos.");
            }
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <img src={logo.url} alt="Entrô" className="h-8 w-auto" />
            <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">Admin</span>
          </div>
          <h1 className="font-display text-xl font-extrabold">Painel interno</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito à equipe da Entrô.</p>
          <div className="mt-5 space-y-3">
            <div>
              <Label htmlFor="admin-email">E-mail</Label>
              <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="admin-password">Senha</Label>
              <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm font-bold text-destructive">{error}</p> : null}
          <Button type="submit" className="mt-5 w-full">Entrar</Button>
        </form>
      </div>
    );
  }

  return <Outlet />;
}
