import { useState } from "react";
import { PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBecomeProducer } from "@/lib/producer-queries";

export function BecomeProducer() {
  const [name, setName] = useState("");
  const becomeProducer = useBecomeProducer();

  const submit = () => {
    if (!name.trim()) return;
    becomeProducer.mutate(name.trim(), {
      onSuccess: () => toast.success("Produtora criada! Bem-vindo(a) ao painel."),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível criar a produtora."),
    });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-background p-6 text-center shadow-pop">
        <PartyPopper className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 font-display text-xl font-extrabold">Crie sua produtora</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta ainda não tem uma produtora. Dê um nome a ela para começar a criar eventos na Entrô.
        </p>
        <div className="mt-5 text-left">
          <Label htmlFor="display-name">Nome da produtora</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Coletivo Alto-Falante"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <Button className="mt-4 w-full" disabled={!name.trim() || becomeProducer.isPending} onClick={submit}>
          {becomeProducer.isPending ? "Criando..." : "Criar minha produtora"}
        </Button>
      </div>
    </div>
  );
}
