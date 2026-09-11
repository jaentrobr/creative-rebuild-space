import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminLayout, PanelCard } from "@/components/admin/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleScopes, type AdminRole } from "@/data/admin";
import { shortDateTime } from "@/lib/format";
import { adminActions, useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/equipe")({
  head: () => ({ meta: [{ title: "Equipe — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminTeam,
});

function AdminTeam() {
  const { team, actionLog } = useAdmin();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("Suporte");
  const [personFilter, setPersonFilter] = useState("todos");
  const [kindFilter, setKindFilter] = useState("todos");

  const filteredLog = useMemo(
    () =>
      actionLog.filter(
        (l) => (personFilter === "todos" || l.who === personFilter) && (kindFilter === "todos" || l.kind === kindFilter),
      ),
    [actionLog, personFilter, kindFilter],
  );
  const kinds = ["Bloqueio", "Suspensão", "Estorno", "Taxa", "Permissão", "Outro"];

  return (
    <AdminLayout
      title="Equipe"
      description="Administradores do painel interno e registro de ações."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Convidar admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="invite-name">Nome</Label>
                <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="invite-email">E-mail</Label>
                <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="invite-role">Permissão</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
                  <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dono">Dono</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Suporte">Suporte</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">{roleScopes[role]}</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!name.trim() || !email.trim()}
                onClick={() => {
                  adminActions.inviteAdmin(name.trim(), email.trim(), role);
                  setName("");
                  setEmail("");
                  setRole("Suporte");
                  setOpen(false);
                }}
              >
                Enviar convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <PanelCard title="Administradores">
        <div className="space-y-3">
          {team.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <p className="font-display text-sm font-extrabold">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{roleScopes[u.role]}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{u.role}</Badge>
                <Button size="sm" variant="destructive" onClick={() => adminActions.removeAdmin(u.id)}>
                  Remover acesso
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Registro de ações" className="mt-5">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="w-48">
            <Select value={personFilter} onValueChange={setPersonFilter}>
              <SelectTrigger aria-label="Filtrar por pessoa"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as pessoas</SelectItem>
                {team.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {kinds.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="divide-y divide-border text-sm">
          {filteredLog.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><strong>{l.who}</strong> — {l.action}</span>
              <span className="text-xs text-muted-foreground">{shortDateTime(l.at)}</span>
            </div>
          ))}
          {filteredLog.length === 0 ? <p className="py-2 text-muted-foreground">Nenhum registro com esses filtros.</p> : null}
        </div>
      </PanelCard>
    </AdminLayout>
  );
}
