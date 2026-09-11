import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Algo deu errado",
  description = "Não conseguimos carregar essa página agora.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-8" />
      </span>
      <h2 className="mt-5 text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground">{description}</p>
      {onRetry && (
        <Button className="mt-6" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
