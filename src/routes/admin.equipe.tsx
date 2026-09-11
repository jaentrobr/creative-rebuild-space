import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout, PanelCard } from "@/components/admin/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { db } from "@/integrations/meu-supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { ROLE_LABELS, logAudit, fetchProfilesMap } from "@/lib/admin-store";
import { shortDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/equipe")({
  head: () => ({
    meta: [{ title: "Equipe — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminTeam,
});

const ADMIN_ROLES: AppRole[] = ["owner", "finance", "support"];

type TeamMember = {
  roleId: string;
  userId: string;
  role: AppRole;
  name: string;
  email: string | null;
  createdAt: string;
};

function useTeam() {
  return useQuery({
    queryKey: ["admin-team"],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await db
        .from("user_roles")
        .select("*")
        .in("role", ADMIN_ROLES)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const profiles = await fetchProfilesMap(rows.map((r) => r.user_id));
      return rows.map((r) => ({
        roleId: r.id,
        userId: r.user_id,
        role: r.role as AppRole,
        name: profiles[r.user_id]?.full_name ?? "Sem nome cadastrado",
        email: profiles[r.user_id]?.email ?? null,
        createdAt: r.created_at,
      }));
    },
  });
}

type AuditRow = {
  id: number;
  actor_id: string | null;
  actorName: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
};

function useAuditLog() {
  return useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await db
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data ?? [];
      const profiles = await fetchProfilesMap(rows.map((r) => r.actor_id));
      return rows.map((r) => ({
        ...r,
        actorName: r.actor_id ? (profiles[r.actor_id]?.full_name ?? "Usuário removido") : "Sistema",
      }));
    },
  });
}

function AdminTeam() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const teamQuery = useTeam();
  const auditQuery = useAuditLog();

  const [assignOpen, setAssignOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("support");
  const [busy, setBusy] = useState(false);
  const [myMfaEnabled, setMyMfaEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void db.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMyMfaEnabled(null);
        return;
      }
      setMyMfaEnabled(data.totp.some((f) => f.status === "verified"));
    });
    return () => {
      active = false;
    };
  }, []);

  const [personFilter, setPersonFilter] = useState("todos");
  const [actionFilter, setActionFilter] = useState("todos");

  const actions = useMemo(
    () => Array.from(new Set((auditQuery.data ?? []).map((l) => l.action))).sort(),
    [auditQuery.data],
  );
  const filteredLog = useMemo(
    () =>
      (auditQuery.data ?? []).filter(
        (l) =>
          (personFilter === "todos" || l.actorName === personFilter) &&
          (actionFilter === "todos" || l.action === actionFilter),
      ),
    [auditQuery.data, personFilter, actionFilter],
  );

  const assignRole = async () => {
    setBusy(true);
    try {
      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("id, full_name, email")
        .eq("email", email.trim())
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile)
        throw new Error(
          "Não encontramos nenhuma conta com esse e-mail. A pessoa precisa se cadastrar na Entrô antes de receber acesso ao admin.",
        );
      const { error } = await db.from("user_roles").insert({ user_id: profile.id, role });
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "assign_admin_role",
        entity: "user_roles",
        entityId: profile.id,
        details: { role, email: profile.email },
      });
      toast.success(
        `Papel "${ROLE_LABELS[role]}" atribuído a ${profile.full_name ?? profile.email}.`,
      );
      setAssignOpen(false);
      setEmail("");
      setRole("support");
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atribuir o papel.");
    } finally {
      setBusy(false);
    }
  };

  const removeAccess = async (member: TeamMember) => {
    try {
      const { error } = await db.from("user_roles").delete().eq("id", member.roleId);
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "remove_admin_role",
        entity: "user_roles",
        entityId: member.userId,
        details: { role: member.role },
      });
      toast.success("Acesso removido.");
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover o acesso.");
    }
  };

  return (
    <AdminLayout
      title="Equipe"
      description="Administradores do painel interno e registro de ações."
      actions={
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Atribuir acesso admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir acesso admin</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Não é possível criar contas novas por aqui: a pessoa precisa já ter uma conta na
              Entrô. Informe o e-mail cadastrado para conceder o papel.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="assign-email">E-mail cadastrado</Label>
                <Input
                  id="assign-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="assign-role">Permissão</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger id="assign-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!email.trim() || busy} onClick={assignRole}>
                {busy ? "Atribuindo…" : "Atribuir papel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <PanelCard title="Administradores">
        {teamQuery.isError ? (
          <ErrorState
            description="Não conseguimos carregar a equipe."
            onRetry={() => teamQuery.refetch()}
          />
        ) : teamQuery.isLoading || !teamQuery.data ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {teamQuery.data.map((u) => (
              <div
                key={u.roleId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-display text-sm font-extrabold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email ?? "sem e-mail"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Verificação em duas etapas:{" "}
                    {u.userId === user?.id ? (
                      myMfaEnabled === null ? (
                        "não disponível"
                      ) : myMfaEnabled ? (
                        <span className="font-semibold text-primary">ativa</span>
                      ) : (
                        <span className="font-semibold text-destructive">inativa</span>
                      )
                    ) : (
                      "não disponível"
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeAccess(u)}
                    disabled={u.userId === user?.id}
                  >
                    Remover acesso
                  </Button>
                </div>
              </div>
            ))}
            {teamQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum administrador cadastrado ainda.
              </p>
            ) : null}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Registro de ações" className="mt-5">
        {auditQuery.isError ? (
          <ErrorState
            description="Não conseguimos carregar o registro de ações."
            onRetry={() => auditQuery.refetch()}
          />
        ) : auditQuery.isLoading || !auditQuery.data ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="w-48">
                <Select value={personFilter} onValueChange={setPersonFilter}>
                  <SelectTrigger aria-label="Filtrar por pessoa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as pessoas</SelectItem>
                    {Array.from(new Set(auditQuery.data.map((l) => l.actorName))).map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-56">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger aria-label="Filtrar por ação">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {actions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="divide-y divide-border text-sm">
              {filteredLog.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong>{l.actorName}</strong> — {l.action} ({l.entity}
                    {l.entity_id ? ` · ${l.entity_id}` : ""})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {shortDateTime(l.created_at)}
                  </span>
                </div>
              ))}
              {filteredLog.length === 0 ? (
                <p className="py-2 text-muted-foreground">Nenhum registro com esses filtros.</p>
              ) : null}
            </div>
          </>
        )}
      </PanelCard>
    </AdminLayout>
  );
}
