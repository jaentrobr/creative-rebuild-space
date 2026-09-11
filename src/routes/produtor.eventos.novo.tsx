import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, ImagePlus, Plus, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { PanelCard, ProducerLayout } from "@/components/producer/producer-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ageRatings,
  cardFee,
  cepLookup,
  genres,
  lotTurnLabels,
  pixFee,
  type FeeMode,
  type LotTurn,
  type ProducerEvent,
  type ProducerTicketType,
  type Visibility,
} from "@/data/producer";
import { brl } from "@/lib/format";
import { producerActions, useProducer } from "@/lib/producer-store";
import { cn } from "@/lib/utils";
import defaultBanner from "@/assets/event-funk.jpg";

export const Route = createFileRoute("/produtor/eventos/novo")({
  validateSearch: (search) => z.object({ editar: z.string().catch("") }).parse(search),
  head: () => ({
    meta: [
      { title: "Criar evento — Painel Entrô" },
      { name: "description", content: "Monte seu evento em cinco etapas: informações, local, ingressos, taxas e publicação." },
      { property: "og:title", content: "Criar evento — Painel Entrô" },
      { property: "og:description", content: "Crie lotes, defina taxas e publique seu evento na Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewEvent,
});

const steps = ["Informações", "Data e local", "Ingressos", "Configurações", "Revisão"];

type DraftLot = { id: string; name: string; price: string; quantity: string; startAt: string; endAt: string; maxPerOrder: string; turn: LotTurn };
type DraftType = { id: string; name: string; free: boolean; half: boolean; lots: DraftLot[] };

const newLot = (): DraftLot => ({
  id: `lot-${Math.random().toString(36).slice(2, 7)}`,
  name: "1º lote",
  price: "50",
  quantity: "100",
  startAt: "",
  endAt: "",
  maxPerOrder: "6",
  turn: "primeiro",
});

const newType = (name = "Pista"): DraftType => ({
  id: `type-${Math.random().toString(36).slice(2, 7)}`,
  name,
  free: false,
  half: true,
  lots: [newLot()],
});

function NewEvent() {
  const { editar } = Route.useSearch();
  const { events, ticketTypes, verification } = useProducer();
  const navigate = useNavigate();
  const editing = events.find((event) => event.id === editar);

  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState("");
  const [published, setPublished] = useState<ProducerEvent | null>(null);
  const [verifyModal, setVerifyModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [info, setInfo] = useState({
    name: editing?.name ?? "",
    genre: editing?.genre ?? "Funk",
    age: editing?.age ?? "18",
    description: editing?.description ?? "",
    banner: editing?.image ?? "",
  });
  const [place, setPlace] = useState({
    startDate: "",
    startTime: "22:00",
    endDate: "",
    endTime: "05:00",
    gates: "21:00",
    venue: editing?.venue ?? "",
    cep: editing?.cep ?? "",
    address: editing?.address ?? "",
    number: editing?.number ?? "",
    district: editing?.district ?? "",
    city: editing?.city ?? "Belo Horizonte",
    state: editing?.state ?? "MG",
  });
  const [types, setTypes] = useState<DraftType[]>(() => {
    const existing = editar ? ticketTypes[editar] : undefined;
    if (existing?.length) {
      return existing.map((type: ProducerTicketType) => ({
        id: type.id,
        name: type.name,
        free: type.free,
        half: type.half,
        lots: type.lots.map((l) => ({
          id: l.id,
          name: l.name,
          price: String(l.price),
          quantity: String(l.quantity),
          startAt: l.startAt.slice(0, 10),
          endAt: l.endAt.slice(0, 10),
          maxPerOrder: String(l.maxPerOrder),
          turn: l.turn,
        })),
      }));
    }
    return [newType()];
  });
  const [settings, setSettings] = useState({
    feeMode: (editing?.settings.feeMode ?? "repassar") as FeeMode,
    installments: editing?.settings.installments ?? 6,
    allowCancel: editing?.settings.allowCancel ?? true,
    transfer: editing?.settings.transfer ?? true,
    transferBlockHours: editing?.settings.transferBlockHours ?? 6,
    visibility: (editing?.settings.visibility ?? "publico") as Visibility,
  });

  const capacity = types.reduce((sum, t) => sum + t.lots.reduce((s, l) => s + Number(l.quantity || 0), 0), 0);
  const maxRevenue = types.reduce(
    (sum, t) => sum + (t.free ? 0 : t.lots.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.price || 0), 0)),
    0,
  );
  const halfCapacity = types.reduce(
    (sum, t) => (t.half ? sum + t.lots.reduce((s, l) => s + Math.floor(Number(l.quantity || 0) * 0.4), 0) : sum),
    0,
  );
  const halfOk = capacity > 0 && halfCapacity / capacity >= 0.4;
  const isFreeOnly = types.every((t) => t.free);

  const banner = info.banner || defaultBanner;

  const feeSim = useMemo(() => {
    const price = 100;
    if (settings.feeMode === "repassar") {
      return `Ingresso de R$ 100: o comprador paga ${brl(100 + pixFee(price))} no Pix (${brl(100 + cardFee(price))} no cartão) e você recebe R$ 100,00.`;
    }
    return `Ingresso de R$ 100: o comprador paga R$ 100,00 e você recebe ${brl(100 - pixFee(price))} no Pix (${brl(100 - cardFee(price))} no cartão).`;
  }, [settings.feeMode]);

  const updateType = (id: string, patch: Partial<DraftType>) =>
    setTypes((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const updateLot = (typeId: string, lotId: string, patch: Partial<DraftLot>) =>
    setTypes((current) =>
      current.map((t) => (t.id === typeId ? { ...t, lots: t.lots.map((l) => (l.id === lotId ? { ...l, ...patch } : l)) } : t)),
    );

  const buildEvent = (status: ProducerEvent["status"]): ProducerEvent => ({
    id: editing?.id ?? `ev-${Date.now()}`,
    slug: (info.name || "novo-evento").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: info.name || "Evento sem nome",
    genre: info.genre,
    age: info.age,
    description: info.description,
    image: banner,
    status,
    salesPaused: false,
    startAt: new Date(`${place.startDate || new Date().toISOString().slice(0, 10)}T${place.startTime}`).toISOString(),
    endAt: new Date(`${place.endDate || place.startDate || new Date().toISOString().slice(0, 10)}T${place.endTime}`).toISOString(),
    gatesAt: new Date(`${place.startDate || new Date().toISOString().slice(0, 10)}T${place.gates}`).toISOString(),
    venue: place.venue,
    cep: place.cep,
    address: place.address,
    number: place.number,
    district: place.district,
    city: place.city,
    state: place.state,
    settings: { ...settings, courtesyLimit: editing?.settings.courtesyLimit ?? 20 },
  });

  const buildTypes = (): ProducerTicketType[] =>
    types.map((t) => ({
      id: t.id,
      name: t.name,
      free: t.free,
      half: t.half,
      lots: t.lots.map((l) => ({
        id: l.id,
        name: l.name,
        price: t.free ? 0 : Number(l.price || 0),
        quantity: Number(l.quantity || 0),
        sold: 0,
        startAt: l.startAt ? new Date(l.startAt).toISOString() : new Date().toISOString(),
        endAt: l.endAt ? new Date(l.endAt).toISOString() : new Date().toISOString(),
        maxPerOrder: Number(l.maxPerOrder || 6),
        turn: l.turn,
      })),
    }));

  const saveDraft = () => {
    const event = buildEvent("Rascunho");
    if (editing) producerActions.updateEvent(editing.id, event);
    else producerActions.addEvent(event, buildTypes());
    setSaved("Rascunho salvo agora mesmo.");
    setTimeout(() => setSaved(""), 3000);
  };

  const publish = () => {
    if (!isFreeOnly && verification !== "Aprovado") {
      setVerifyModal(true);
      return;
    }
    const event = buildEvent("Publicado");
    if (editing) producerActions.updateEvent(editing.id, event);
    else producerActions.addEvent(event, buildTypes());
    setPublished(event);
  };

  const eventUrl = published ? `https://jaentro.com.br/evento/${published.slug}` : "";

  if (published) {
    return (
      <ProducerLayout title="Evento publicado!" description="Seu evento já pode receber vendas.">
        <PanelCard className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-7" /></div>
          <h2 className="mt-4 font-display text-xl font-extrabold">{published.name}</h2>
          <p className="mt-2 break-all text-sm text-muted-foreground">{eventUrl}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => { void navigator.clipboard?.writeText(eventUrl); setCopied(true); }}>
              <Copy className="size-4" /> {copied ? "Link copiado" : "Copiar link"}
            </Button>
            <Button variant="outline" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Bora? ${published.name}: ${eventUrl}`)}`} target="_blank" rel="noreferrer">
                <Share2 className="size-4" /> Compartilhar no WhatsApp
              </a>
            </Button>
            <Button variant="ghost" asChild><Link to="/produtor/eventos">Ver meus eventos</Link></Button>
          </div>
        </PanelCard>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout
      title={editing ? "Editar evento" : "Criar evento"}
      description={`Etapa ${step + 1} de 5 — ${steps[step]}`}
      actions={<Button variant="outline" onClick={saveDraft}>Salvar rascunho</Button>}
    >
      <Progress value={((step + 1) / steps.length) * 100} className="mb-5" />
      {saved ? <p className="mb-4 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-ink">{saved}</p> : null}

      {step === 0 ? (
        <PanelCard title="Informações">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="nome">Nome do evento</Label>
              <Input id="nome" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="Baile Violeta" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Gênero musical</Label>
                <Select value={info.genre} onValueChange={(value) => setInfo({ ...info, genre: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Classificação etária</Label>
                <Select value={info.age} onValueChange={(value) => setInfo({ ...info, age: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ageRatings.map((a) => <SelectItem key={a} value={a}>{a === "Livre" ? "Livre" : `${a} anos`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="desc">Descrição</Label>
              <div className="mb-2 flex gap-2">
                {[["**negrito**", "Negrito"], ["_itálico_", "Itálico"], ["\n- item", "Lista"]].map(([token, label]) => (
                  <Button key={label} type="button" size="sm" variant="outline" onClick={() => setInfo((c) => ({ ...c, description: `${c.description}${token}` }))}>{label}</Button>
                ))}
              </div>
              <Textarea id="desc" rows={5} value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} placeholder="Conte como vai ser a festa" />
            </div>
            <div>
              <Label>Banner do evento</Label>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <img src={banner} alt="Pré-visualização do banner" className="h-28 w-44 rounded-xl border-2 border-foreground object-cover" />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-foreground bg-background px-4 py-2 text-sm font-bold shadow-pop">
                  <ImagePlus className="size-4" /> Enviar imagem
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setInfo((c) => ({ ...c, banner: URL.createObjectURL(file) }));
                    }}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Prévia usada no card e na página do evento.</p>
            </div>
          </div>
        </PanelCard>
      ) : null}

      {step === 1 ? (
        <PanelCard title="Data e local">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Início</Label><Input type="date" value={place.startDate} onChange={(e) => setPlace({ ...place, startDate: e.target.value })} /></div>
            <div><Label>Hora de início</Label><Input type="time" value={place.startTime} onChange={(e) => setPlace({ ...place, startTime: e.target.value })} /></div>
            <div><Label>Término</Label><Input type="date" value={place.endDate} onChange={(e) => setPlace({ ...place, endDate: e.target.value })} /></div>
            <div><Label>Hora de término</Label><Input type="time" value={place.endTime} onChange={(e) => setPlace({ ...place, endTime: e.target.value })} /></div>
            <div><Label>Abertura dos portões</Label><Input type="time" value={place.gates} onChange={(e) => setPlace({ ...place, gates: e.target.value })} /></div>
            <div><Label>Nome do local</Label><Input value={place.venue} onChange={(e) => setPlace({ ...place, venue: e.target.value })} placeholder="Galpão Violeta" /></div>
            <div>
              <Label>CEP</Label>
              <Input
                value={place.cep}
                onChange={(e) => {
                  const cep = e.target.value;
                  const found = cepLookup(cep);
                  setPlace((c) => ({ ...c, cep, ...(found ?? {}) }));
                }}
                placeholder="30140-071"
              />
              <p className="mt-1 text-xs text-muted-foreground">Preenchimento automático simulado.</p>
            </div>
            <div><Label>Endereço</Label><Input value={place.address} onChange={(e) => setPlace({ ...place, address: e.target.value })} /></div>
            <div><Label>Número</Label><Input value={place.number} onChange={(e) => setPlace({ ...place, number: e.target.value })} /></div>
            <div><Label>Bairro</Label><Input value={place.district} onChange={(e) => setPlace({ ...place, district: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={place.city} onChange={(e) => setPlace({ ...place, city: e.target.value })} /></div>
            <div><Label>Estado</Label><Input value={place.state} onChange={(e) => setPlace({ ...place, state: e.target.value })} /></div>
          </div>
          <div className="mt-4 grid h-40 place-items-center rounded-xl border-2 border-dashed border-border bg-muted text-sm font-semibold text-muted-foreground">
            Pré-visualização do mapa: {place.address || "endereço"} {place.number}, {place.city}
          </div>
        </PanelCard>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          {types.map((type) => (
            <PanelCard
              key={type.id}
              title={type.name || "Novo tipo"}
              action={
                types.length > 1 ? (
                  <Button size="sm" variant="ghost" onClick={() => setTypes((c) => c.filter((t) => t.id !== type.id))}><Trash2 className="size-4" /> Remover</Button>
                ) : null
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1"><Label>Nome do tipo</Label><Input value={type.name} onChange={(e) => updateType(type.id, { name: e.target.value })} /></div>
                <div className="flex items-end gap-3">
                  <Switch id={`free-${type.id}`} checked={type.free} onCheckedChange={(value) => updateType(type.id, { free: value })} />
                  <Label htmlFor={`free-${type.id}`}>Ingresso gratuito</Label>
                </div>
                <div className="flex items-end gap-3">
                  <Switch id={`half-${type.id}`} checked={type.half} onCheckedChange={(value) => updateType(type.id, { half: value })} />
                  <Label htmlFor={`half-${type.id}`}>Meia-entrada</Label>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {type.lots.map((l) => (
                  <div key={l.id} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-3">
                    <div><Label>Nome do lote</Label><Input value={l.name} onChange={(e) => updateLot(type.id, l.id, { name: e.target.value })} /></div>
                    <div><Label>Preço (R$)</Label><Input inputMode="numeric" disabled={type.free} value={type.free ? "0" : l.price} onChange={(e) => updateLot(type.id, l.id, { price: e.target.value })} /></div>
                    <div><Label>Quantidade</Label><Input inputMode="numeric" value={l.quantity} onChange={(e) => updateLot(type.id, l.id, { quantity: e.target.value })} /></div>
                    <div><Label>Início das vendas</Label><Input type="date" value={l.startAt} onChange={(e) => updateLot(type.id, l.id, { startAt: e.target.value })} /></div>
                    <div><Label>Fim das vendas</Label><Input type="date" value={l.endAt} onChange={(e) => updateLot(type.id, l.id, { endAt: e.target.value })} /></div>
                    <div><Label>Limite por compra</Label><Input inputMode="numeric" value={l.maxPerOrder} onChange={(e) => updateLot(type.id, l.id, { maxPerOrder: e.target.value })} /></div>
                    <div className="sm:col-span-2">
                      <Label>Virada de lote</Label>
                      <Select value={l.turn} onValueChange={(value) => updateLot(type.id, l.id, { turn: value as LotTurn })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(lotTurnLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      {type.lots.length > 1 ? (
                        <Button size="sm" variant="ghost" onClick={() => updateType(type.id, { lots: type.lots.filter((x) => x.id !== l.id) })}>Remover lote</Button>
                      ) : null}
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => updateType(type.id, { lots: [...type.lots, newLot()] })}><Plus className="size-4" /> Adicionar lote</Button>
              </div>
            </PanelCard>
          ))}

          <Button variant="outline" onClick={() => setTypes((c) => [...c, newType("Novo tipo")])}><Plus className="size-4" /> Adicionar tipo de ingresso</Button>

          <div className={cn("rounded-2xl border-2 border-foreground p-4 shadow-pop", halfOk ? "bg-background" : "bg-sun text-ink")}>
            <p className="text-sm font-bold">Pela Lei 12.933/2013, a meia-entrada deve ser garantida a no mínimo 40% dos ingressos.</p>
            <p className="mt-1 text-sm">
              Hoje você tem <strong>{halfCapacity}</strong> ingressos de meia em <strong>{capacity}</strong> no total ({capacity ? Math.round((halfCapacity / capacity) * 100) : 0}%).{" "}
              {halfOk ? "Atende à regra." : "Ainda não atende aos 40%."}
            </p>
          </div>

          <PanelCard title="Resumo">
            <p className="text-sm">Capacidade total: <strong>{capacity}</strong> ingressos</p>
            <p className="text-sm">Receita máxima estimada: <strong>{brl(maxRevenue)}</strong></p>
          </PanelCard>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <PanelCard title="Quem paga a taxa">
            <RadioGroup value={settings.feeMode} onValueChange={(value) => setSettings({ ...settings, feeMode: value as FeeMode })} className="gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-semibold">
                <RadioGroupItem value="repassar" /> Repassar ao comprador (padrão)
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-semibold">
                <RadioGroupItem value="absorver" /> Absorver a taxa
              </label>
            </RadioGroup>
            <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{feeSim}</p>
            <p className="mt-2 text-xs text-muted-foreground">Pix: 7% (mínimo R$ 3,50). Cartão: 8% (mínimo R$ 3,99).</p>
          </PanelCard>

          <PanelCard title="Parcelamento no cartão">
            <Select value={String(settings.installments)} onValueChange={(value) => setSettings({ ...settings, installments: Number(value) })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">Juros do parcelamento ficam por conta do comprador.</p>
          </PanelCard>

          <PanelCard title="Cancelamento e transferência">
            <div className="flex items-start gap-3">
              <Switch id="cancel" checked={settings.allowCancel} onCheckedChange={(value) => setSettings({ ...settings, allowCancel: value })} />
              <Label htmlFor="cancel" className="leading-snug">Permitir cancelamento até 48h antes do evento com taxa de 10% (a taxa fica com você), depois dos 7 dias de arrependimento</Label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Switch id="transfer" checked={settings.transfer} onCheckedChange={(value) => setSettings({ ...settings, transfer: value })} />
              <Label htmlFor="transfer">Permitir transferência de ingressos</Label>
            </div>
            {settings.transfer ? (
              <div className="mt-3 w-56">
                <Label>Bloquear transferências antes do evento</Label>
                <Select value={String(settings.transferBlockHours)} onValueChange={(value) => setSettings({ ...settings, transferBlockHours: Number(value) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[2, 6, 12, 24, 48].map((h) => <SelectItem key={h} value={String(h)}>{h} horas antes</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : null}
          </PanelCard>

          <PanelCard title="Visibilidade">
            <RadioGroup value={settings.visibility} onValueChange={(value) => setSettings({ ...settings, visibility: value as Visibility })} className="gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-semibold"><RadioGroupItem value="publico" /> Público (aparece na busca)</label>
              <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-semibold"><RadioGroupItem value="privado" /> Privado (só por link)</label>
            </RadioGroup>
          </PanelCard>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          {[
            { title: "Informações", to: 0, rows: [`Nome: ${info.name || "—"}`, `Gênero: ${info.genre}`, `Classificação: ${info.age}`] },
            { title: "Data e local", to: 1, rows: [`Início: ${place.startDate || "—"} ${place.startTime}`, `Local: ${place.venue || "—"}`, `Endereço: ${place.address} ${place.number}, ${place.city}`] },
            { title: "Ingressos", to: 2, rows: [`${types.length} tipos`, `Capacidade: ${capacity}`, `Receita máxima: ${brl(maxRevenue)}`, `Meia-entrada: ${halfOk ? "atende aos 40%" : "abaixo dos 40%"}`] },
            { title: "Configurações", to: 3, rows: [settings.feeMode === "repassar" ? "Taxa repassada ao comprador" : "Taxa absorvida por você", `Parcelamento até ${settings.installments}x`, settings.visibility === "publico" ? "Público" : "Privado"] },
          ].map((block) => (
            <PanelCard key={block.title} title={block.title} action={<Button size="sm" variant="ghost" onClick={() => setStep(block.to)}>Editar</Button>}>
              <ul className="space-y-1 text-sm text-muted-foreground">{block.rows.map((row) => <li key={row}>{row}</li>)}</ul>
            </PanelCard>
          ))}
          <Button size="lg" onClick={publish}>Publicar evento</Button>
        </div>
      ) : null}

      <div className="mt-6 flex justify-between gap-3">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Voltar</Button>
        {step < 4 ? <Button onClick={() => setStep((s) => Math.min(4, s + 1))}>Continuar</Button> : null}
      </div>

      <Dialog open={verifyModal} onOpenChange={setVerifyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-primary" /> Verificação obrigatória</DialogTitle>
            <DialogDescription>
              Para publicar eventos com ingresso pago, sua conta precisa estar verificada. É o que garante que o dinheiro das vendas caia no seu CPF ou CNPJ.
              Eventos só gratuitos publicam sem verificação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => navigate({ to: "/produtor/verificacao", search: { voltar: "novo" } })}>Fazer verificação agora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProducerLayout>
  );
}
