import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Clock, ShieldCheck, Upload, XCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { PanelCard, ProducerLayout } from "@/components/producer/producer-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskCpf, maskDate, maskPhone, validateCpf, validateDate } from "@/lib/format";
import { producerActions, useProducer } from "@/lib/producer-store";
import { useAuth } from "@/lib/auth";
import { useProducerPrivate, useUpsertProducerPrivate } from "@/lib/producer-queries";

export const Route = createFileRoute("/produtor/verificacao")({
  validateSearch: (search) => z.object({ voltar: z.string().catch("") }).parse(search),
  head: () => ({
    meta: [
      { title: "Verificação da conta — Painel Entrô" },
      { name: "description", content: "Envie seus dados e documentos para receber o dinheiro das vendas." },
      { property: "og:title", content: "Verificação da conta — Painel Entrô" },
      { property: "og:description", content: "Pessoa física ou jurídica, documentos e status da análise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Verification,
});

const companyTypes = ["MEI", "LTDA", "Individual", "Associação"];

function Verification() {
  const { voltar } = Route.useSearch();
  const { verification, verificationReason } = useProducer();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [personType, setPersonType] = useState<"fisica" | "juridica">("juridica");
  const [pf, setPf] = useState({ name: "", cpf: "", birth: "", income: "", cep: "", address: "", number: "", city: "", state: "" });
  const [contactPhone, setContactPhone] = useState("");
  const [pj, setPj] = useState({ cnpj: "", legalName: "", tradeName: "", companyType: "LTDA", revenue: "", cep: "", address: "", number: "", city: "", state: "", ownerName: "", ownerCpf: "", ownerBirth: "" });
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const adult = (value: string) => {
    if (!validateDate(value)) return false;
    const [d, m, y] = value.split("/").map(Number);
    const birth = new Date(y!, m! - 1, d!);
    return Date.now() - birth.getTime() >= 18 * 365.25 * 86400000;
  };

  const upload = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setDocs((current) => ({ ...current, [key]: URL.createObjectURL(file) }));
  };

  const docFields = personType === "juridica"
    ? [["frente", "Documento com foto (frente)"], ["verso", "Documento com foto (verso)"], ["selfie", "Selfie segurando o documento"], ["contrato", "Contrato social ou CCMEI"]]
    : [["frente", "Documento com foto (frente)"], ["verso", "Documento com foto (verso)"], ["selfie", "Selfie segurando o documento"]];

  const validateData = () => {
    if (personType === "fisica") {
      if (!pf.name || !validateCpf(pf.cpf)) return "Confira o nome completo e o CPF.";
      if (!adult(pf.birth)) return "É preciso ter 18 anos ou mais.";
      if (!pf.cep) return "Preencha o endereço.";
    } else {
      if (pj.cnpj.replace(/\D/g, "").length !== 14 || !pj.legalName) return "Confira o CNPJ e a razão social.";
      if (!validateCpf(pj.ownerCpf) || !adult(pj.ownerBirth)) return "Confira os dados do responsável (maior de 18 anos).";
    }
    if (contactPhone.replace(/\D/g, "").length < 10) return "Celular inválido. Use DDD + número";
    return "";
  };

  const submit = async () => {
    const digits = contactPhone.replace(/\D/g, "");
    try {
      await savePrivate.mutateAsync({ contact_phone: `55${digits}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o celular de contato.");
      return;
    }
    producerActions.setVerification("Em análise");
    setStep(3);
  };

  const statusIcon = verification === "Aprovado" ? BadgeCheck : verification === "Recusado" ? XCircle : Clock;
  const StatusIcon = statusIcon;

  return (
    <ProducerLayout title="Verificação" description="Pedimos isso por exigência do Banco Central. É o que garante que o dinheiro das suas vendas cai no seu CPF ou CNPJ.">
      <Progress value={((step + 1) / 4) * 100} className="mb-5" />

      {step === 0 ? (
        <PanelCard title="Tipo de conta">
          <RadioGroup value={personType} onValueChange={(value) => setPersonType(value as "fisica" | "juridica")} className="gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-semibold"><RadioGroupItem value="fisica" /> Pessoa física</label>
            <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-semibold"><RadioGroupItem value="juridica" /> Pessoa jurídica</label>
          </RadioGroup>
          <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">Pessoa jurídica tem limite maior de saque via Pix e pode usar antecipação automática.</p>
          <Button className="mt-4" onClick={() => setStep(1)}>Continuar</Button>
        </PanelCard>
      ) : null}

      {step === 1 ? (
        <PanelCard title={personType === "fisica" ? "Seus dados" : "Dados da empresa"}>
          {personType === "fisica" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome completo</Label><Input value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} /></div>
              <div><Label>CPF</Label><Input value={pf.cpf} onChange={(e) => setPf({ ...pf, cpf: maskCpf(e.target.value) })} /></div>
              <div><Label>Data de nascimento</Label><Input value={pf.birth} onChange={(e) => setPf({ ...pf, birth: maskDate(e.target.value) })} placeholder="00/00/0000" /></div>
              <div><Label>Renda mensal</Label><Input value={pf.income} onChange={(e) => setPf({ ...pf, income: e.target.value })} placeholder="R$ 5.000" /></div>
              
              <div><Label>CEP</Label><Input value={pf.cep} onChange={(e) => setPf({ ...pf, cep: e.target.value })} /></div>
              <div><Label>Endereço</Label><Input value={pf.address} onChange={(e) => setPf({ ...pf, address: e.target.value })} /></div>
              <div><Label>Número</Label><Input value={pf.number} onChange={(e) => setPf({ ...pf, number: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={pf.city} onChange={(e) => setPf({ ...pf, city: e.target.value })} /></div>
              <div><Label>Estado</Label><Input value={pf.state} onChange={(e) => setPf({ ...pf, state: e.target.value })} /></div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>CNPJ</Label><Input value={pj.cnpj} onChange={(e) => setPj({ ...pj, cnpj: e.target.value })} placeholder="00.000.000/0001-00" /></div>
              <div><Label>Razão social</Label><Input value={pj.legalName} onChange={(e) => setPj({ ...pj, legalName: e.target.value })} /></div>
              <div><Label>Nome fantasia</Label><Input value={pj.tradeName} onChange={(e) => setPj({ ...pj, tradeName: e.target.value })} /></div>
              <div>
                <Label>Tipo de empresa</Label>
                <Select value={pj.companyType} onValueChange={(value) => setPj({ ...pj, companyType: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{companyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Faturamento mensal</Label><Input value={pj.revenue} onChange={(e) => setPj({ ...pj, revenue: e.target.value })} placeholder="R$ 50.000" /></div>
              <div><Label>CEP da empresa</Label><Input value={pj.cep} onChange={(e) => setPj({ ...pj, cep: e.target.value })} /></div>
              <div><Label>Endereço</Label><Input value={pj.address} onChange={(e) => setPj({ ...pj, address: e.target.value })} /></div>
              <div><Label>Número</Label><Input value={pj.number} onChange={(e) => setPj({ ...pj, number: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={pj.city} onChange={(e) => setPj({ ...pj, city: e.target.value })} /></div>
              <div><Label>Estado</Label><Input value={pj.state} onChange={(e) => setPj({ ...pj, state: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Responsável — nome completo</Label><Input value={pj.ownerName} onChange={(e) => setPj({ ...pj, ownerName: e.target.value })} /></div>
              <div><Label>Responsável — CPF</Label><Input value={pj.ownerCpf} onChange={(e) => setPj({ ...pj, ownerCpf: maskCpf(e.target.value) })} /></div>
              <div><Label>Responsável — nascimento</Label><Input value={pj.ownerBirth} onChange={(e) => setPj({ ...pj, ownerBirth: maskDate(e.target.value) })} placeholder="00/00/0000" /></div>
            </div>
          )}
          <div className="mt-4 max-w-sm">
            <Label>Celular para contato</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(maskPhone(e.target.value))} placeholder="(00) 90000-0000" />
            <p className="mt-1 text-xs text-muted-foreground">Usado apenas para contato sobre sua conta.</p>
          </div>
          {error ? <p className="mt-3 text-sm font-semibold text-destructive">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
            <Button onClick={() => { const message = validateData(); setError(message); if (!message) setStep(2); }}>Continuar</Button>
          </div>
        </PanelCard>
      ) : null}

      {step === 2 ? (
        <PanelCard title="Documentos">
          <div className="grid gap-4 sm:grid-cols-2">
            {docFields.map(([key, label]) => (
              <label key={key} className="cursor-pointer rounded-xl border-2 border-dashed border-border p-4 text-center">
                {docs[key!] ? (
                  <img src={docs[key!]} alt={label} className="mx-auto h-28 rounded-lg object-cover" />
                ) : (
                  <Upload className="mx-auto size-6 text-muted-foreground" />
                )}
                <p className="mt-2 text-sm font-semibold">{label}</p>
                <input type="file" accept="image/*" className="hidden" onChange={upload(key!)} />
              </label>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            Pedimos isso por exigência do Banco Central. É o que garante que o dinheiro das suas vendas cai no seu CPF ou CNPJ.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => void submit()} disabled={savePrivate.isPending}>Enviar para análise</Button>
          </div>
        </PanelCard>
      ) : null}

      {step === 3 ? (
        <PanelCard title="Status da verificação">
          <div className="flex items-center gap-3">
            <StatusIcon className="size-8 text-primary" />
            <div>
              <p className="font-display text-lg font-extrabold">{verification}</p>
              <p className="text-sm text-muted-foreground">
                {verification === "Em análise"
                  ? "Prazo estimado de até 2 dias úteis."
                  : verification === "Aprovado"
                    ? "Tudo certo! Você já pode publicar eventos pagos e sacar."
                    : verificationReason || "Documento ilegível. Envie novas fotos com boa iluminação."}
              </p>
            </div>
          </div>
          {verification === "Recusado" ? <Button className="mt-4" onClick={() => setStep(2)}>Reenviar documentos</Button> : null}
          {voltar === "novo" && verification === "Aprovado" ? (
            <Button className="mt-4" onClick={() => navigate({ to: "/produtor/eventos/novo", search: { editar: "" } })}>Voltar para a criação do evento</Button>
          ) : null}
          <div className="mt-6 border-t border-border pt-3">
            <button
              className="text-xs text-muted-foreground underline"
              onClick={() =>
                producerActions.setVerification(
                  verification === "Em análise" ? "Aprovado" : verification === "Aprovado" ? "Recusado" : "Em análise",
                  "Documento ilegível. Envie novas fotos com boa iluminação.",
                )
              }
            >
              Alternar status (teste)
            </button>
          </div>
        </PanelCard>
      ) : null}
    </ProducerLayout>
  );
}
