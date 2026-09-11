import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { BecomeProducer } from "@/components/producer/become-producer";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

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

  return <Outlet />;
}
