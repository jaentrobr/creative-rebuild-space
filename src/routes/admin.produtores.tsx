import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout, PanelCard, StatCard, StatusPill } from "@/components/admin/admin-layout";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/integrations/meu-supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import type { Enums, Tables } from "@/integrations/meu-supabase/types";
import { useAuth } from "@/lib/auth";
import { VERIFICATION_LABELS, logAudit } from "@/lib/admin-store";
import { brl, shortDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtores")({
  head: () => ({
    meta: [{ title: "Produtores — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminProducers,
});

type ProducerRow = Tables<"producers"> & { producer_private: Tables<"producer_private"> | null };

const PAGE_SIZE = 20;

function useProducers(search: string, verification: string, page: number) {
  return useQuery({
    queryKey: ["admin-producers", search, verification, page],
    queryFn: async () => {
      let query = db
        .from("producers")
        .select("*, producer_private(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (search.trim()) query = query.ilike("display_name", `%${search.trim()}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      let rows = (data ?? []) as unknown as ProducerRow[];
      if (verification !== "todas") {
        rows = rows.filter(
          (r) => (r.producer_private?.verification_status ?? "not_started") === verification,
        );
      }
      return { rows, count: count ?? 0 };
    },
  });
}

function AdminProducers() {
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState("todas");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useProducers(search, verification, page);

  if (selected) return <ProducerDetail producerId={selected} onBack={() => setSelected(null)} />;

  return (
    <AdminLayout title="Produtores" description="Todos os produtores cadastrados na Entrô.">
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full sm:w-72"
        />
        <div className="w-48">
          <Select
            value={verification}
            onValueChange={(v) => {
              setVerification(v);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Filtrar por verificação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as verificações</SelectItem>
              {Object.entries(VERIFICATION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <ErrorState
          description="Não conseguimos carregar os produtores."
          onRetry={() => refetch()}
        />
      ) : isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <PanelCard>
          <div className="space-y-3">
            {data.rows.map((p) => {
              const verif = p.producer_private?.verification_status ?? "not_started";
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className="w-full rounded-xl border border-border p-4 text-left transition-colors hover:border-foreground"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-base font-extrabold">{p.display_name}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.producer_private?.is_blocked ? (
                        <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive">
                          Bloqueado
                        </span>
                      ) : null}
                      {p.producer_private?.risk_flag ? (
                        <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-ink">
                          Risco
                        </span>
                      ) : null}
                      <StatusPill status={VERIFICATION_LABELS[verif]} />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.producer_private?.document ?? "Sem documento"} · Cadastro:{" "}
                    {shortDate(p.created_at)}
                  </p>
                </button>
              );
            })}
            {data.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produtor por aqui ainda.</p>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {page + 1} de {Math.max(1, Math.ceil(data.count / PAGE_SIZE))}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={(page + 1) * PAGE_SIZE >= data.count}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </PanelCard>
      )}
    </AdminLayout>
  );
}

function ProducerDetail({ producerId, onBack }: { producerId: string; onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-producer-detail", producerId],
    queryFn: async () => {
      const [producerRes, eventsRes, ordersAggRes] = await Promise.all([
        db.from("producers").select("*, producer_private(*)").eq("id", producerId).maybeSingle(),
        db
          .from("events")
          .select("id, title, status, is_featured")
          .eq("producer_id", producerId)
          .order("created_at", { ascending: false }),
        db.from("events").select("id").eq("producer_id", producerId),
      ]);
      if (producerRes.error) throw producerRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (ordersAggRes.error) throw ordersAggRes.error;
      const eventIds = (ordersAggRes.data ?? []).map((e) => e.id);
      let volume = 0;
      if (eventIds.length > 0) {
        const { data: orders, error } = await db
          .from("orders")
          .select("total, event_id")
          .eq("status", "paid")
          .in("event_id", eventIds);
        if (error) throw error;
        volume = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);
      }
      return {
        producer: producerRes.data as unknown as
          (Tables<"producers"> & { producer_private: Tables<"producer_private"> | null }) | null,
        events: eventsRes.data ?? [],
        volume,
      };
    },
  });

  const setVerification = async (status: Enums<"verification_status">) => {
    setBusy(true);
    try {
      const { error } = await db
        .from("producer_private")
        .update({ verification_status: status, verification_notes: note || null })
        .eq("producer_id", producerId);
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action:
          status === "approved" ? "approve_producer_verification" : "reject_producer_verification",
        entity: "producer_private",
        entityId: producerId,
        details: { note },
      });
      toast.success(status === "approved" ? "Verificação aprovada." : "Verificação recusada.");
      qc.invalidateQueries({ queryKey: ["admin-producer-detail", producerId] });
      qc.invalidateQueries({ queryKey: ["admin-producers"] });
    } catch (e) {
      toast.error(friendlyError(e as { message?: string }, "Não foi possível atualizar a verificação."));
    } finally {
      setBusy(false);
    }
  };

  if (isError)
    return (
      <AdminLayout
        title="Produtor"
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            Voltar
          </Button>
        }
      >
        <ErrorState onRetry={() => refetch()} />
      </AdminLayout>
    );
  if (isLoading || !data)
    return (
      <AdminLayout title="Carregando…">
        <Skeleton className="h-64 w-full" />
      </AdminLayout>
    );

  const producer = data.producer;
  if (!producer)
    return (
      <AdminLayout
        title="Produtor não encontrado"
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            Voltar
          </Button>
        }
      >
        <p className="text-muted-foreground">Este produtor não existe mais.</p>
      </AdminLayout>
    );
  const verif = producer.producer_private?.verification_status ?? "not_started";

  return (
    <AdminLayout
      title={producer.display_name}
      description={producer.producer_private?.legal_name ?? undefined}
      actions={
        <Button size="sm" variant="outline" onClick={onBack}>
          Voltar
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Verificação" value={VERIFICATION_LABELS[verif]} />
        <StatCard label="Eventos" value={String(data.events.length)} />
        <StatCard label="Volume vendido" value={brl(data.volume)} tone="primary" />
      </div>

      <PanelCard title="Dados cadastrais" className="mt-5">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            Documento:{" "}
            <span className="font-semibold">{producer.producer_private?.document ?? "—"}</span>
          </p>
          <p>
            Tipo:{" "}
            <span className="font-semibold">{producer.producer_private?.person_type ?? "—"}</span>
          </p>
          <p>
            Responsável:{" "}
            <span className="font-semibold">
              {producer.producer_private?.responsible_name ?? "—"}
            </span>
          </p>
          <p>
            WhatsApp: <span className="font-semibold">{producer.whatsapp ?? "—"}</span>
          </p>
          <p>
            Celular para contato:{" "}
            <span className="font-semibold">{producer.producer_private?.contact_phone ?? "—"}</span>
          </p>
          <p>
            Instagram: <span className="font-semibold">{producer.instagram ?? "—"}</span>
          </p>
          <p>
            Cadastro: <span className="font-semibold">{shortDate(producer.created_at)}</span>
          </p>
        </div>
      </PanelCard>

      <PanelCard title="Verificação de identidade" className="mt-5">
        <p className="text-sm">
          Status atual: <StatusPill status={VERIFICATION_LABELS[verif]} />
        </p>
        {producer.producer_private?.verification_notes ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Última observação: {producer.producer_private.verification_notes}
          </p>
        ) : null}
        <div className="mt-3">
          <Textarea
            placeholder="Observação (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => setVerification("approved")}>
            Aprovar verificação
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => setVerification("rejected")}
          >
            Recusar verificação
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Dados bancários/Asaas (conta e carteira) não são editáveis por aqui — dependem da
          integração de pagamento, fora de escopo.
        </p>
      </PanelCard>

      <PanelCard title="Eventos" className="mt-5">
        <div className="divide-y divide-border text-sm">
          {data.events.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {e.title}
                {e.is_featured ? " ⭐" : ""}
              </span>
              <StatusPill status={e.status} />
            </div>
          ))}
          {data.events.length === 0 ? (
            <p className="text-muted-foreground">Nenhum evento cadastrado.</p>
          ) : null}
        </div>
      </PanelCard>
    </AdminLayout>
  );
}
