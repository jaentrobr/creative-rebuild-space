import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AdminLayout, PanelCard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/require-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/integrations/meu-supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico — Admin Entrô" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <RequireAuth roles={["owner"]}>
      <AdminDiagnostics />
    </RequireAuth>
  ),
});

const BUCKETS = ["event-banners", "producer-logos", "home-banners", "verification-docs"] as const;
const FUNCTIONS = [
  "issue-tickets",
  "create-staff-user",
  "notify-event-reschedule",
  "send-test-email",
] as const;
const SECRETS = ["RESEND_API_KEY", "SITE_URL"] as const;

type HealthCheckResponse = {
  db?: boolean;
  secrets?: Partial<Record<(typeof SECRETS)[number], boolean>>;
  buckets?: Partial<Record<(typeof BUCKETS)[number], boolean>>;
  functions?: Partial<Record<(typeof FUNCTIONS)[number], boolean>>;
} | null;

function Indicator({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
      <span>{label}</span>
      {ok === null ? (
        <span className="text-xs font-semibold text-muted-foreground">não disponível</span>
      ) : ok ? (
        <span className="flex items-center gap-1 font-semibold text-primary">
          <CheckCircle2 className="size-4" /> ok
        </span>
      ) : (
        <span className="flex items-center gap-1 font-semibold text-destructive">
          <XCircle className="size-4" /> falhou
        </span>
      )}
    </div>
  );
}

function useDiagnostics() {
  return useQuery({
    queryKey: ["admin-diagnostics"],
    queryFn: async () => {
      const [dbCheck, bucketChecks, healthCheck] = await Promise.all([
        db.from("platform_settings").select("id").eq("id", 1).maybeSingle(),
        Promise.all(
          BUCKETS.map(async (bucket) => {
            const { error } = await db.storage.from(bucket).list("", { limit: 1 });
            return [bucket, !error] as const;
          }),
        ),
        db.functions.invoke<HealthCheckResponse>("health-check").catch((e) => ({
          data: null,
          error: e as { message?: string },
        })),
      ]);

      const dbOk = !dbCheck.error;
      const buckets: Record<string, boolean> = Object.fromEntries(bucketChecks);
      const health = healthCheck.data ?? null;
      const healthAvailable = !healthCheck.error && !!health;

      return {
        dbOk,
        dbError: dbCheck.error ?? null,
        buckets,
        healthAvailable,
        healthError: healthCheck.error ?? null,
        secrets: health?.secrets ?? null,
        functions: health?.functions ?? null,
      };
    },
  });
}

function AdminDiagnostics() {
  const { data, isLoading, isError, refetch, error } = useDiagnostics();
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const sendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const { error: fnError } = await db.functions.invoke("send-test-email");
      if (fnError) throw fnError;
      toast.success("E-mail de teste enviado.");
    } catch (e) {
      toast.error(friendlyError(e as { message?: string }, "Não foi possível enviar o e-mail de teste."));
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <AdminLayout
      title="Diagnóstico"
      description="Indicadores de saúde da plataforma (banco, secrets, armazenamento e funções)."
      actions={
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Atualizar
        </Button>
      }
    >
      {isError ? (
        <p className="text-sm text-destructive">{friendlyError(error as { message?: string })}</p>
      ) : isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <PanelCard title="Conexão com o banco">
            <Indicator ok={data.dbOk} label="Consulta a platform_settings" />
          </PanelCard>

          <PanelCard title="Secrets" className="mt-5">
            {!data.healthAvailable ? (
              <p className="text-sm text-muted-foreground">
                Não foi possível consultar a função health-check para verificar os secrets.
              </p>
            ) : (
              <div className="space-y-2">
                {SECRETS.map((s) => (
                  <Indicator
                    key={s}
                    ok={data.secrets ? (data.secrets[s] ?? null) : null}
                    label={s}
                  />
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Buckets de armazenamento" className="mt-5">
            <div className="space-y-2">
              {BUCKETS.map((b) => (
                <Indicator key={b} ok={data.buckets[b] ?? null} label={b} />
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Edge Functions" className="mt-5">
            {!data.healthAvailable ? (
              <p className="text-sm text-muted-foreground">
                Não foi possível consultar a função health-check para verificar as funções.
              </p>
            ) : (
              <div className="space-y-2">
                {FUNCTIONS.map((f) => (
                  <Indicator
                    key={f}
                    ok={data.functions ? (data.functions[f] ?? null) : null}
                    label={f}
                  />
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="E-mail de teste" className="mt-5">
            <p className="text-sm text-muted-foreground">
              Envia um e-mail de teste através do Resend para validar a configuração de disparo.
            </p>
            <Button
              className="mt-3"
              variant="outline"
              disabled={sendingTestEmail}
              onClick={sendTestEmail}
            >
              {sendingTestEmail ? "Enviando…" : "Enviar e-mail de teste"}
            </Button>
          </PanelCard>
        </>
      )}
    </AdminLayout>
  );
}
