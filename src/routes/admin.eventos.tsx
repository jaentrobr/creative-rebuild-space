import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminLayout, PanelCard, StatusPill } from "@/components/admin/admin-layout";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cities, genres, producerById } from "@/data/admin";
import { brl, intBr, shortDateTime } from "@/lib/format";
import { adminActions, useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/eventos")({
  head: () => ({ meta: [{ title: "Eventos — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminEvents,
});

function AdminEvents() {
  const { events, producers } = useAdmin();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [city, setCity] = useState("todas");
  const [genre, setGenre] = useState("todos");
  const [producer, setProducer] = useState("todos");
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (search.trim() === "" || e.name.toLowerCase().includes(search.toLowerCase())) &&
          (status === "todos" || e.status === status) &&
          (city === "todas" || e.city === city) &&
          (genre === "todos" || e.genre === genre) &&
          (producer === "todos" || e.producerId === producer),
      ),
    [events, search, status, city, genre, producer],
  );

  return (
    <AdminLayout title="Eventos" description="Todos os eventos publicados na Entrô.">
      <div className="mb-4 flex flex-wrap gap-3">
        <Input placeholder="Buscar por nome" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        <div className="w-40">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {["Rascunho", "Publicado", "Encerrado", "Cancelado", "Suspenso"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger aria-label="Filtrar por cidade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as cidades</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger aria-label="Filtrar por gênero"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os gêneros</SelectItem>
              {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={producer} onValueChange={setProducer}>
            <SelectTrigger aria-label="Filtrar por produtor"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os produtores</SelectItem>
              {producers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PanelCard>
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-base font-extrabold">{e.name}</p>
                <div className="flex flex-wrap gap-1">
                  {e.featured ? <Badge className="bg-sun text-ink">Destaque</Badge> : null}
                  <StatusPill status={e.status} />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {e.genre} · {e.city} · {producerById(e.producerId)?.name ?? "—"} · {shortDateTime(e.startAt)}
              </p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <p>Ingressos vendidos: <span className="font-semibold text-foreground">{intBr(e.ticketsSold)}/{intBr(e.capacity)}</span></p>
                <p>Volume: <span className="font-semibold text-foreground">{brl(e.volume)}</span></p>
                {e.status === "Suspenso" ? <p>Motivo: <span className="font-semibold text-foreground">{e.suspendReason}</span></p> : <p />}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/evento/$slug" params={{ slug: e.slug }} search={{ ref: "" }} target="_blank">Ver como comprador</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => adminActions.toggleFeatured(e.id)}>
                  {e.featured ? "Remover destaque" : "Destacar na página inicial"}
                </Button>
                {e.status === "Suspenso" ? (
                  <Button size="sm" onClick={() => adminActions.unsuspendEvent(e.id)}>Reativar evento</Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={() => setSuspendId(e.id)}>Suspender evento</Button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p> : null}
        </div>
      </PanelCard>

      <AlertDialog open={!!suspendId} onOpenChange={(open) => !open && setSuspendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender evento</AlertDialogTitle>
            <AlertDialogDescription>As vendas serão pausadas até nova análise. Informe o motivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="suspend-reason">Motivo</Label>
            <Textarea id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: denúncia de ingressos falsificados" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim()}
              onClick={() => {
                if (suspendId) adminActions.suspendEvent(suspendId, reason.trim());
                setReason("");
                setSuspendId(null);
              }}
            >
              Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
