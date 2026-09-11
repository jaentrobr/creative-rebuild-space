import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { BecomeProducer } from "@/components/producer/become-producer";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAcceptProducerTerms, usePlatformSettings, useProducerTermsAcceptance } from "@/lib/producer-queries";

export const Route = createFileRoute("/produtor")({
  component: () => (
    <RequireAuth>
      <ProducerGate />
    </RequireAuth>
  ),
});

function ProducerGate() {
  const { loading, producer } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!producer) return <BecomeProducer />;

  return (
    <>
      <TermsBanner />
      <Outlet />
    </>
  );
}

function TermsBanner() {
  const { user } = useAuth();
  const { data: settings } = usePlatformSettings();
  const { data: acceptance, isLoading } = useProducerTermsAcceptance(user?.id);
  const accept = useAcceptProducerTerms(user?.id);

  const currentVersion = settings?.producer_terms_version ?? "1.1";
  if (isLoading || !user) return null;
  if (acceptance?.version === currentVersion) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Os Termos do Produtor foram atualizados (versão {currentVersion}), incluindo as regras de alteração de data do evento.{" "}
          <Link to="/termos-produtor" className="font-semibold underline">Ler os termos</Link>
        </p>
        <Button
          size="sm"
          disabled={accept.isPending}
          onClick={() =>
            accept.mutate(currentVersion, {
              onSuccess: () => toast.success("Termos aceitos."),
              onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível registrar o aceite."),
            })
          }
        >
          {accept.isPending ? "Registrando..." : "Aceitar termos"}
        </Button>
      </div>
    </div>
  );
}
