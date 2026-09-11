import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout, PanelCard, StatusPill } from "@/components/admin/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db } from "@/integrations/meu-supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import type { Enums, Tables } from "@/integrations/meu-supabase/types";
import { useAuth } from "@/lib/auth";
import { EVENT_STATUS_LABELS, logAudit } from "@/lib/admin-store";
import { brl, intBr, shortDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/eventos")({
  head: () => ({
    meta: [{ title: "Eventos — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminEvents,
});

type EventRow = Tables<"events"> & { producers: { display_name: string } | null };

function useEvents() {
  return useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await db
        .from("events")
        .select("*, producers(display_name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const events = (data ?? []) as unknown as EventRow[];
      const ids = events.map((e) => e.id);
      let lots: Tables<"lots">[] = [];
      let orders: { event_id: string; total: number }[] = [];
      if (ids.length > 0) {
        const [lotsRes, ordersRes] = await Promise.all([
          db.from("lots").select("*").in("event_id", ids),
          db.from("orders").select("event_id, total").eq("status", "paid").in("event_id", ids),
        ]);
        if (lotsRes.error) throw lotsRes.error;
        if (ordersRes.error) throw ordersRes.error;
        lots = lotsRes.data ?? [];
        orders = ordersRes.data ?? [];
      }
      const capacityByEvent = new Map<string, number>();
      const soldByEvent = new Map<string, number>();
      for (const l of lots) {
        capacityByEvent.set(l.event_id, (capacityByEvent.get(l.event_id) ?? 0) + l.quantity);
        soldByEvent.set(l.event_id, (soldByEvent.get(l.event_id) ?? 0) + l.sold_count);
      }
      const volumeByEvent = new Map<string, number>();
      for (const o of orders)
        volumeByEvent.set(o.event_id, (volumeByEvent.get(o.event_id) ?? 0) + Number(o.total));

      return events.map((e) => ({
        ...e,
        capacity: capacityByEvent.get(e.id) ?? 0,
        sold: soldByEvent.get(e.id) ?? 0,
        volume: volumeByEvent.get(e.id) ?? 0,
      }));
    },
  });
}

function useProducersList() {
  return useQuery({
    queryKey: ["admin-producers-list"],
    queryFn: async () => {
      const { data, error } = await db
        .from("producers")
        .select("id, display_name")
        .order("display_name")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

type RescheduleSummary = { keep_count: number; refund_count: number; pending_count: number };

function useEventReschedules(eventId: string | null) {
  return useQuery({
    queryKey: ["admin-event-reschedules", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const [historyRes, summaryRes] = await Promise.all([
        db
          .from("event_reschedules")
          .select("*")
          .eq("event_id", eventId as string)
          .order("created_at", { ascending: false }),
        db.rpc("get_reschedule_summary", { p_event_id: eventId as string }),
      ]);
      if (historyRes.error) throw historyRes.error;
      if (summaryRes.error) throw summaryRes.error;
      const history = (historyRes.data ?? []) as Tables<"event_reschedules">[];
      const summary = (summaryRes.data ?? null) as unknown as RescheduleSummary | null;
      return { history, summary };
    },
  });
}

function AdminEvents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const eventsQuery = useEvents();
  const producersQuery = useProducersList();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [city, setCity] = useState("todas");
  const [genre, setGenre] = useState("todos");
  const [producer, setProducer] = useState("todos");
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const cities = useMemo(
    () =>
      Array.from(
        new Set((eventsQuery.data ?? []).map((e) => e.city).filter((c): c is string => !!c)),
      ).sort(),
    [eventsQuery.data],
  );
  const genres = useMemo(
    () =>
      Array.from(
        new Set((eventsQuery.data ?? []).map((e) => e.genre).filter((g): g is string => !!g)),
      ).sort(),
    [eventsQuery.data],
  );

  const filtered = useMemo(
    () =>
      (eventsQuery.data ?? []).filter(
        (e) =>
          (search.trim() === "" || e.title.toLowerCase().includes(search.toLowerCase())) &&
          (status === "todos" || e.status === status) &&
          (city === "todas" || e.city === city) &&
          (genre === "todos" || e.genre === genre) &&
          (producer === "todos" || e.producer_id === producer),
      ),
    [eventsQuery.data, search, status, city, genre, producer],
  );

  const toggleFeatured = async (e: Tables<"events">) => {
    try {
      const { error } = await db
        .from("events")
        .update({ is_featured: !e.is_featured })
        .eq("id", e.id);
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: e.is_featured ? "unfeature_event" : "feature_event",
        entity: "events",
        entityId: e.id,
      });
      qc.invalidateQueries({ queryKey: ["admin-events"] });
    } catch (err) {
      toast.error(friendlyError(err as { message?: string }, "Não foi possível atualizar o destaque."));
    }
  };

  const suspendEvent = async () => {
    if (!suspendId) return;
    try {
      const { error } = await db
        .from("events")
        .update({ status: "suspended", suspended_reason: reason.trim() })
        .eq("id", suspendId);
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "suspend_event",
        entity: "events",
        entityId: suspendId,
        details: { reason: reason.trim() },
      });
      toast.success("Evento suspenso.");
      setReason("");
      setSuspendId(null);
      qc.invalidateQueries({ queryKey: ["admin-events"] });
    } catch (err) {
      toast.error(friendlyError(err as { message?: string }, "Não foi possível suspender o evento."));
    }
  };

  const unsuspendEvent = async (e: Tables<"events">) => {
    try {
      const { error } = await db
        .from("events")
        .update({ status: "published", suspended_reason: null })
        .eq("id", e.id);
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "unsuspend_event",
        entity: "events",
        entityId: e.id,
      });
      toast.success("Evento reativado.");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
    } catch (err) {
      toast.error(friendlyError(err as { message?: string }, "Não foi possível reativar o evento."));
    }
  };

  return (
    <AdminLayout title="Eventos" description="Todos os eventos cadastrados na Entrô.">
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <div className="w-44">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger aria-label="Filtrar por cidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as cidades</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger aria-label="Filtrar por gênero">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os gêneros</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={producer} onValueChange={setProducer}>
            <SelectTrigger aria-label="Filtrar por produtor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os produtores</SelectItem>
              {(producersQuery.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {eventsQuery.isError ? (
        <ErrorState
          description="Não conseguimos carregar os eventos."
          onRetry={() => eventsQuery.refetch()}
        />
      ) : eventsQuery.isLoading || !eventsQuery.data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <PanelCard>
          <div className="space-y-3">
            {filtered.map((e) => (
              <div key={e.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-base font-extrabold">{e.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {e.is_featured ? <Badge className="bg-sun text-ink">Destaque</Badge> : null}
                    <StatusPill status={e.status} />
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {e.genre ?? "—"} · {e.city ?? "—"} · {e.producers?.display_name ?? "—"} ·{" "}
                  {e.starts_at ? shortDateTime(e.starts_at) : "sem data"}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <p>
                    Ingressos vendidos:{" "}
                    <span className="font-semibold text-foreground">
                      {intBr(e.sold)}/{intBr(e.capacity)}
                    </span>
                  </p>
                  <p>
                    Volume pago:{" "}
                    <span className="font-semibold text-foreground">{brl(e.volume)}</span>
                  </p>
                  {e.status === "suspended" ? (
                    <p>
                      Motivo:{" "}
                      <span className="font-semibold text-foreground">
                        {e.suspended_reason ?? "—"}
                      </span>
                    </p>
                  ) : (
                    <p />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDetailId(e.id)}>
                    Ver detalhes
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      to="/evento/$slug"
                      params={{ slug: e.slug }}
                      search={{ ref: "" }}
                      target="_blank"
                    >
                      Ver como comprador
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleFeatured(e)}>
                    {e.is_featured ? "Remover destaque" : "Destacar na página inicial"}
                  </Button>
                  {e.status === "suspended" ? (
                    <Button size="sm" onClick={() => unsuspendEvent(e)}>
                      Reativar evento
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => setSuspendId(e.id)}>
                      Suspender evento
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
            ) : null}
          </div>
        </PanelCard>
      )}

      <AlertDialog open={!!suspendId} onOpenChange={(open) => !open && setSuspendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender evento</AlertDialogTitle>
            <AlertDialogDescription>
              As vendas serão pausadas até nova análise. Informe o motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="suspend-reason">Motivo</Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: denúncia de ingressos falsificados"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={!reason.trim()} onClick={suspendEvent}>
              Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EventDetailDialog eventId={detailId} onOpenChange={(open) => !open && setDetailId(null)} />
    </AdminLayout>
  );
}

function EventDetailDialog({
  eventId,
  onOpenChange,
}: {
  eventId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const rescheduleQuery = useEventReschedules(eventId);

  return (
    <Dialog open={!!eventId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de alteração de data</DialogTitle>
        </DialogHeader>
        {rescheduleQuery.isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : rescheduleQuery.isError ? (
          <p className="text-sm text-destructive">
            Não foi possível carregar o histórico de alterações.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-bold">Resumo das escolhas do público</p>
              {rescheduleQuery.data?.summary ? (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-extrabold">
                      {intBr(rescheduleQuery.data.summary.keep_count)}
                    </p>
                    <p className="text-muted-foreground">Mantiveram</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-extrabold">
                      {intBr(rescheduleQuery.data.summary.refund_count)}
                    </p>
                    <p className="text-muted-foreground">Pediram reembolso</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-extrabold">
                      {intBr(rescheduleQuery.data.summary.pending_count)}
                    </p>
                    <p className="text-muted-foreground">Sem resposta</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Este evento nunca teve a data alterada.
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-bold">Alterações registradas</p>
              {(rescheduleQuery.data?.history.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma alteração de data registrada.
                </p>
              ) : (
                <div className="space-y-2">
                  {rescheduleQuery.data?.history.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
                      <p>
                        <span className="text-muted-foreground">De</span>{" "}
                        <strong>{r.old_starts_at ? shortDateTime(r.old_starts_at) : "—"}</strong>{" "}
                        <span className="text-muted-foreground">para</span>{" "}
                        <strong>{r.new_starts_at ? shortDateTime(r.new_starts_at) : "—"}</strong>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Motivo: {r.reason ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Avisado em:{" "}
                        {r.notified_at ? shortDateTime(r.notified_at) : "Ainda não avisado"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Registrado em {shortDateTime(r.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
