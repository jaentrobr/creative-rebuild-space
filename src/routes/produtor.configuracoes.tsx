import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PanelCard, ProducerLayout } from "@/components/producer/producer-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { maskPhone } from "@/lib/format";
import { producerActions, useProducer } from "@/lib/producer-store";
import { EMPRESA } from "@/config/empresa";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/produtor/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da produtora — Painel Entrô" },
      { name: "description", content: "Edite os dados da sua produtora, chave Pix e notificações." },
      { property: "og:title", content: "Configurações da produtora — Painel Entrô" },
      { property: "og:description", content: "Perfil público, chave Pix de saque e avisos por evento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProducerSettings,
});

function ProducerSettings() {
  const { profile, notifications, termsAcceptance } = useProducer();
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);

  return (
    <ProducerLayout title="Configurações" description="Tudo o que aparece na página dos seus eventos e onde o dinheiro cai.">
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Dados da produtora">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-14 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">{form.logoInitials}</div>
              <label className="cursor-pointer rounded-xl border-2 border-foreground px-3 py-2 text-sm font-bold shadow-pop">
                Trocar logo
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} /></div>
            <div><Label>Descrição (aparece na página do evento)</Label><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          </div>
        </PanelCard>

        <div className="space-y-4">
          <PanelCard title="Chave Pix para saque">
            <Label>Chave do mesmo titular do cadastro</Label>
            <Input value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} />
            <p className="mt-2 text-xs text-muted-foreground">Só aceitamos chaves no mesmo CPF ou CNPJ da conta verificada.</p>
          </PanelCard>

          <PanelCard title="Termos do produtor">
            {termsAcceptance ? (
              <p className="text-sm text-muted-foreground">
                Termos aceitos: versão {termsAcceptance.version} em {new Date(termsAcceptance.acceptedAt).toLocaleDateString("pt-BR")} às{" "}
                {new Date(termsAcceptance.acceptedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Você ainda não aceitou os Termos do produtor (versão {EMPRESA.VERSAO_TERMOS}).</p>
            )}
            <Link to="/termos-produtor" className="mt-2 inline-block text-sm font-bold text-primary underline">Termos do produtor</Link>
          </PanelCard>

          <PanelCard title="Notificações">
            {[
              ["sale", "Nova venda"],
              ["lotSoldOut", "Lote esgotado"],
              ["refund", "Pedido de reembolso"],
              ["withdraw", "Saque concluído"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <Label htmlFor={key}>{label}</Label>
                <Switch
                  id={key}
                  checked={notifications[key as keyof typeof notifications]}
                  onCheckedChange={(value) => producerActions.updateNotifications({ [key as keyof typeof notifications]: value })}
                />
              </div>
            ))}
          </PanelCard>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={() => { producerActions.updateProfile(form); setSaved(true); setTimeout(() => setSaved(false), 2500); }}>Salvar alterações</Button>
        {saved ? <span className="text-sm font-bold text-primary">Salvo!</span> : null}
      </div>
    </ProducerLayout>
  );
}
