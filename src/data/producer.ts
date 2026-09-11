import electronic from "@/assets/event-electronic.jpg";
import pagode from "@/assets/event-pagode.jpg";
import funk from "@/assets/event-funk.jpg";
import sertanejo from "@/assets/event-sertanejo.jpg";

/** Todos os dados abaixo são fictícios e ficam apenas no front-end. */

export type EventStatus = "Rascunho" | "Publicado" | "Encerrado" | "Cancelado";
export type VerificationStatus = "Não iniciada" | "Em análise" | "Aprovado" | "Recusado";
export type FeeMode = "repassar" | "absorver";
export type Visibility = "publico" | "privado";
export type LotTurn = "esgotar" | "data" | "primeiro";

export type ProducerLot = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  startAt: string;
  endAt: string;
  maxPerOrder: number;
  turn: LotTurn;
};

export type ProducerTicketType = {
  id: string;
  name: string;
  free: boolean;
  half: boolean;
  lots: ProducerLot[];
};

export type ProducerEvent = {
  id: string;
  slug: string;
  name: string;
  genre: string;
  age: string;
  description: string;
  image: string;
  status: EventStatus;
  salesPaused: boolean;
  startAt: string;
  endAt: string;
  gatesAt: string;
  venue: string;
  cep: string;
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  settings: {
    feeMode: FeeMode;
    installments: number;
    allowCancel: boolean;
    transfer: boolean;
    transferBlockHours: number;
    visibility: Visibility;
    courtesyLimit: number;
  };
};

export const genres = ["Funk", "Sertanejo", "Eletrônica", "Pagode", "Rap/Trap", "Rock", "Open bar", "Universitária", "Outro"];
export const ageRatings = ["Livre", "14", "16", "18"];
export const lotTurnLabels: Record<LotTurn, string> = {
  esgotar: "Quando esgotar",
  data: "Na data final",
  primeiro: "O que acontecer primeiro",
};

export const PIX_FEE = 0.07;
export const PIX_MIN = 3.5;
export const CARD_FEE = 0.08;
export const CARD_MIN = 3.99;

export const pixFee = (value: number) => Math.max(PIX_MIN, value * PIX_FEE);
export const cardFee = (value: number) => Math.max(CARD_MIN, value * CARD_FEE);

const day = 86400000;
const iso = (offsetDays: number, hour = 22) => {
  const d = new Date(Date.now() + offsetDays * day);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const lot = (
  id: string,
  name: string,
  price: number,
  quantity: number,
  sold: number,
  startDays: number,
  endDays: number,
): ProducerLot => ({
  id,
  name,
  price,
  quantity,
  sold,
  startAt: iso(startDays, 10),
  endAt: iso(endDays, 23),
  maxPerOrder: 6,
  turn: "primeiro",
});

export const producerProfile = {
  name: "Coletivo Alto-Falante",
  logoInitials: "CA",
  instagram: "@altofalante",
  whatsapp: "(31) 99123-4455",
  bio: "Produtora mineira de festas independentes desde 2016.",
  pixKey: "12.345.678/0001-90",
  personType: "juridica" as "fisica" | "juridica",
  email: "contato@altofalante.com.br",
};

export const initialEvents: ProducerEvent[] = [
  {
    id: "ev-baile",
    slug: "baile-violeta",
    name: "Baile Violeta",
    genre: "Funk",
    age: "18",
    description: "A maior noite de funk consciente de BH, com três pistas e convidados especiais.",
    image: funk,
    status: "Publicado",
    salesPaused: false,
    startAt: iso(20, 23),
    endAt: iso(21, 5),
    gatesAt: iso(20, 22),
    venue: "Galpão Violeta",
    cep: "30140-071",
    address: "Rua Sapucaí",
    number: "300",
    district: "Floresta",
    city: "Belo Horizonte",
    state: "MG",
    settings: {
      feeMode: "repassar",
      installments: 6,
      allowCancel: true,
      transfer: true,
      transferBlockHours: 6,
      visibility: "publico",
      courtesyLimit: 50,
    },
  },
  {
    id: "ev-fabrica",
    slug: "fabrica-de-bass",
    name: "Fábrica de Bass",
    genre: "Eletrônica",
    age: "18",
    description: "Line-up de techno e drum and bass em galpão industrial.",
    image: electronic,
    status: "Publicado",
    salesPaused: false,
    startAt: iso(3, 23),
    endAt: iso(4, 6),
    gatesAt: iso(3, 22),
    venue: "Usina 22",
    cep: "31230-100",
    address: "Av. Cristiano Machado",
    number: "1200",
    district: "Cidade Nova",
    city: "Belo Horizonte",
    state: "MG",
    settings: {
      feeMode: "repassar",
      installments: 4,
      allowCancel: true,
      transfer: true,
      transferBlockHours: 6,
      visibility: "publico",
      courtesyLimit: 30,
    },
  },
  {
    id: "ev-samba",
    slug: "samba-da-lapa",
    name: "Samba do Alto",
    genre: "Pagode",
    age: "16",
    description: "Roda de samba com feijoada e convidados da cidade.",
    image: pagode,
    status: "Encerrado",
    salesPaused: false,
    startAt: iso(-10, 16),
    endAt: iso(-10, 23),
    gatesAt: iso(-10, 15),
    venue: "Quintal do Alto",
    cep: "30310-000",
    address: "Rua Fernandes Tourinho",
    number: "88",
    district: "Savassi",
    city: "Belo Horizonte",
    state: "MG",
    settings: {
      feeMode: "absorver",
      installments: 3,
      allowCancel: true,
      transfer: true,
      transferBlockHours: 6,
      visibility: "publico",
      courtesyLimit: 20,
    },
  },
  {
    id: "ev-rascunho",
    slug: "sertanejo-da-serra",
    name: "Sertanejo da Serra (rascunho)",
    genre: "Sertanejo",
    age: "18",
    description: "",
    image: sertanejo,
    status: "Rascunho",
    salesPaused: false,
    startAt: iso(60, 21),
    endAt: iso(61, 4),
    gatesAt: iso(60, 20),
    venue: "",
    cep: "",
    address: "",
    number: "",
    district: "",
    city: "Belo Horizonte",
    state: "MG",
    settings: {
      feeMode: "repassar",
      installments: 6,
      allowCancel: true,
      transfer: true,
      transferBlockHours: 6,
      visibility: "publico",
      courtesyLimit: 20,
    },
  },
];

export const initialTicketTypes: Record<string, ProducerTicketType[]> = {
  "ev-baile": [
    {
      id: "tt-pista",
      name: "Pista",
      free: false,
      half: true,
      lots: [
        lot("l-p1", "1º lote", 50, 300, 300, -40, -20),
        lot("l-p2", "2º lote", 70, 400, 236, -20, 19),
        lot("l-p3", "Lote final", 90, 300, 0, 19, 20),
      ],
    },
    {
      id: "tt-vip",
      name: "VIP",
      free: false,
      half: true,
      lots: [
        lot("l-v1", "1º lote", 120, 150, 96, -40, 19),
        lot("l-v2", "2º lote", 150, 150, 0, 19, 20),
      ],
    },
    {
      id: "tt-camarote",
      name: "Camarote",
      free: false,
      half: false,
      lots: [lot("l-c1", "Único", 260, 60, 22, -40, 20)],
    },
  ],
  "ev-fabrica": [
    {
      id: "tt-f-pista",
      name: "Pista",
      free: false,
      half: true,
      lots: [
        lot("l-f1", "1º lote", 60, 250, 250, -30, -10),
        lot("l-f2", "2º lote", 80, 350, 188, -10, 2),
      ],
    },
    {
      id: "tt-f-vip",
      name: "Lounge",
      free: false,
      half: false,
      lots: [lot("l-f3", "Único", 160, 80, 41, -30, 2)],
    },
  ],
  "ev-samba": [
    {
      id: "tt-s-pista",
      name: "Pista",
      free: false,
      half: true,
      lots: [lot("l-s1", "Único", 40, 400, 362, -60, -11)],
    },
  ],
  "ev-rascunho": [],
};

/* ---------- gerador determinístico de participantes e vendas ---------- */

const firstNames = ["Marina", "Lucas", "Bia", "Rafael", "Camila", "Diego", "Juliana", "Pedro", "Aline", "Thiago", "Larissa", "Gustavo", "Renata", "Vitor", "Sabrina", "Caio"];
const lastNames = ["Rocha", "Duarte", "Almeida", "Santos", "Ferreira", "Lima", "Costa", "Barbosa", "Nunes", "Teixeira", "Moura", "Prado"];

let seed = 42;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

export type Participant = {
  id: string;
  eventId: string;
  name: string;
  email: string;
  cpf: string;
  type: string;
  lot: string;
  half: boolean;
  price: number;
  payment: "Pix" | "Cartão";
  installments: number;
  status: "Válido" | "Utilizado" | "Transferido" | "Reembolsado";
  checkedIn: boolean;
  purchasedAt: string;
  code: string;
};

const buildParticipants = (): Participant[] => {
  seed = 42;
  const list: Participant[] = [];
  for (const event of initialEvents) {
    const types = initialTicketTypes[event.id] ?? [];
    for (const type of types) {
      for (const l of type.lots) {
        const count = Math.min(l.sold, Math.round(l.sold / 6) + 6);
        for (let i = 0; i < count; i++) {
          const half = type.half && rnd() < 0.35;
          const past = new Date(event.startAt).getTime() < Date.now();
          const r = rnd();
          const status: Participant["status"] = past
            ? r < 0.9
              ? "Utilizado"
              : r < 0.96
                ? "Válido"
                : "Reembolsado"
            : r < 0.9
              ? "Válido"
              : r < 0.96
                ? "Transferido"
                : "Reembolsado";
          const payment: Participant["payment"] = rnd() < 0.62 ? "Pix" : "Cartão";
          const daysAgo = Math.round(rnd() * 35) + 1;
          list.push({
            id: `${l.id}-p${i}`,
            eventId: event.id,
            name: `${firstNames[Math.floor(rnd() * firstNames.length)]} ${lastNames[Math.floor(rnd() * lastNames.length)]}`,
            email: `pessoa${list.length + 1}@email.com`,
            cpf: `${100 + Math.floor(rnd() * 800)}.${100 + Math.floor(rnd() * 800)}.${100 + Math.floor(rnd() * 800)}-${10 + Math.floor(rnd() * 80)}`,
            type: type.name,
            lot: l.name,
            half,
            price: half ? l.price / 2 : l.price,
            payment,
            installments: payment === "Cartão" ? [1, 1, 2, 3, 6][Math.floor(rnd() * 5)]! : 1,
            status,
            checkedIn: past ? rnd() < 0.88 : false,
            purchasedAt: new Date(Date.now() - daysAgo * day).toISOString(),
            code: `ENTRO-${Math.floor(1000 + rnd() * 8999)}-${Math.floor(1000 + rnd() * 8999)}`,
          });
        }
      }
    }
  }
  return list;
};

export const participants: Participant[] = buildParticipants();

export const maskCpfPartial = (cpf: string) => `***.${cpf.slice(4, 7)}.${cpf.slice(8, 11)}-**`;

export const eventParticipants = (eventId: string) => participants.filter((p) => p.eventId === eventId);

export const eventSold = (eventId: string) =>
  (initialTicketTypes[eventId] ?? []).reduce((sum, t) => sum + t.lots.reduce((s, l) => s + l.sold, 0), 0);

export const eventCapacity = (eventId: string) =>
  (initialTicketTypes[eventId] ?? []).reduce((sum, t) => sum + t.lots.reduce((s, l) => s + l.quantity, 0), 0);

export const eventRevenue = (eventId: string) =>
  (initialTicketTypes[eventId] ?? []).reduce((sum, t) => sum + t.lots.reduce((s, l) => s + l.sold * l.price, 0), 0);

/* ---------- vendas por dia ---------- */

export type SalesPoint = { date: string; label: string; eventId: string; value: number; tickets: number };

export const salesByDay: SalesPoint[] = (() => {
  seed = 7;
  const points: SalesPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * day);
    for (const event of initialEvents) {
      if (event.status === "Rascunho") continue;
      const base = event.id === "ev-baile" ? 2400 : event.id === "ev-fabrica" ? 1800 : 900;
      const past = new Date(event.startAt).getTime() < d.getTime() - day;
      const value = past ? 0 : Math.round(base * (0.4 + rnd()));
      points.push({
        date: d.toISOString(),
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        eventId: event.id,
        value,
        tickets: Math.round(value / 70),
      });
    }
  }
  return points;
})();

/* ---------- financeiro ---------- */

export type StatementEntry = {
  id: string;
  date: string;
  kind: "Venda" | "Taxa" | "Estorno" | "Adiantamento" | "Antecipação" | "Saque" | "Comissão";
  eventId?: string;
  description: string;
  amount: number;
};

export const statement: StatementEntry[] = (() => {
  seed = 99;
  const rows: StatementEntry[] = [];
  for (let i = 0; i < 28; i++) {
    const event = initialEvents[Math.floor(rnd() * 3)]!;
    const gross = Math.round(400 + rnd() * 2600);
    const d = new Date(Date.now() - Math.round(rnd() * 40) * day).toISOString();
    rows.push({ id: `st-v${i}`, date: d, kind: "Venda", eventId: event.id, description: `Vendas do dia — ${event.name}`, amount: gross });
    rows.push({ id: `st-t${i}`, date: d, kind: "Taxa", eventId: event.id, description: "Taxa Entrô", amount: -Number(pixFee(gross).toFixed(2)) });
  }
  rows.push({ id: "st-e1", date: new Date(Date.now() - 6 * day).toISOString(), kind: "Estorno", eventId: "ev-baile", description: "Reembolso — arrependimento em 7 dias", amount: -74.9 });
  rows.push({ id: "st-e2", date: new Date(Date.now() - 12 * day).toISOString(), kind: "Estorno", eventId: "ev-fabrica", description: "Reembolso — cancelamento com taxa", amount: -72 });
  rows.push({ id: "st-a1", date: new Date(Date.now() - 9 * day).toISOString(), kind: "Adiantamento", eventId: "ev-baile", description: "Adiantamento do Pix (taxa 2,99%)", amount: 4850.5 });
  rows.push({ id: "st-a2", date: new Date(Date.now() - 3 * day).toISOString(), kind: "Adiantamento", eventId: "ev-fabrica", description: "Adiantamento do Pix (taxa 2,99%)", amount: 2910.2 });
  rows.push({ id: "st-s1", date: new Date(Date.now() - 20 * day).toISOString(), kind: "Saque", description: "Saque via Pix", amount: -3000 });
  rows.push({ id: "st-s2", date: new Date(Date.now() - 11 * day).toISOString(), kind: "Saque", description: "Saque via Pix", amount: -1500 });
  rows.push({ id: "st-s3", date: new Date(Date.now() - 2 * day).toISOString(), kind: "Saque", description: "Saque via TED (R$ 5,00 de tarifa)", amount: -2005 });
  rows.push({ id: "st-c1", date: new Date(Date.now() - 5 * day).toISOString(), kind: "Comissão", eventId: "ev-baile", description: "Comissão de divulgador — LEO10", amount: -420 });
  return rows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
})();

export type Receivable = { id: string; eventId: string; dueAt: string; amount: number; installment: string };

export const receivables: Receivable[] = (() => {
  seed = 123;
  const rows: Receivable[] = [];
  for (let i = 0; i < 10; i++) {
    const event = initialEvents[Math.floor(rnd() * 2)]!;
    rows.push({
      id: `rc-${i}`,
      eventId: event.id,
      dueAt: new Date(Date.now() + (5 + i * 4) * day).toISOString(),
      amount: Math.round(600 + rnd() * 2800),
      installment: rnd() < 0.5 ? "À vista" : `Parcelado ${2 + Math.floor(rnd() * 5)}x`,
    });
  }
  return rows;
})();

export const balances = {
  available: 18420.55,
  pending: 9650.3,
  cardToReceive: receivables.reduce((s, r) => s + r.amount, 0),
  chargebackHold: 2310.4,
  pixAdvanceAvailable: 7400,
};

export const totalSales = statement.filter((s) => s.kind === "Venda").reduce((s, r) => s + r.amount, 0);
export const totalTicketsSold = initialEvents.reduce((s, e) => s + eventSold(e.id), 0);

/* ---------- reembolsos ---------- */

export type Refund = {
  id: string;
  buyer: string;
  eventId: string;
  ticket: string;
  purchasedAt: string;
  requestedAt: string;
  reason: string;
  rule: "Arrependimento em 7 dias" | "Cancelamento com taxa" | "Evento cancelado";
  amount: number;
  status: "Processando" | "Concluído" | "Recusado";
};

export const refunds: Refund[] = [
  { id: "rf-1", buyer: "Camila Duarte", eventId: "ev-baile", ticket: "Pista — 2º lote", purchasedAt: iso(-8), requestedAt: iso(-6), reason: "Mudança de planos", rule: "Arrependimento em 7 dias", amount: 74.9, status: "Concluído" },
  { id: "rf-2", buyer: "Rafael Lima", eventId: "ev-fabrica", ticket: "Pista — 2º lote", purchasedAt: iso(-25), requestedAt: iso(-12), reason: "Não vou conseguir ir", rule: "Cancelamento com taxa", amount: 72, status: "Concluído" },
  { id: "rf-3", buyer: "Aline Costa", eventId: "ev-baile", ticket: "VIP — 1º lote", purchasedAt: iso(-30), requestedAt: iso(-2), reason: "Viagem de trabalho", rule: "Cancelamento com taxa", amount: 108, status: "Processando" },
  { id: "rf-4", buyer: "Thiago Moura", eventId: "ev-samba", ticket: "Pista — Único", purchasedAt: iso(-40), requestedAt: iso(-14), reason: "Evento cancelado pelo produtor", rule: "Evento cancelado", amount: 43.5, status: "Concluído" },
];

/* ---------- cupons, cortesias, divulgadores, portaria ---------- */

export type Coupon = { id: string; eventId: string; code: string; kind: "percent" | "value"; amount: number; limit: number; used: number; validUntil: string; types: string[]; active: boolean };

export const initialCoupons: Coupon[] = [
  { id: "cp-1", eventId: "ev-baile", code: "VIOLETA10", kind: "percent", amount: 10, limit: 200, used: 84, validUntil: iso(18), types: ["Pista"], active: true },
  { id: "cp-2", eventId: "ev-baile", code: "AMIGOS20", kind: "value", amount: 20, limit: 50, used: 50, validUntil: iso(10), types: ["Pista", "VIP"], active: false },
  { id: "cp-3", eventId: "ev-fabrica", code: "BASS15", kind: "percent", amount: 15, limit: 100, used: 27, validUntil: iso(2), types: ["Pista"], active: true },
];

export type Courtesy = { id: string; eventId: string; name: string; email: string; type: string; quantity: number; status: "Enviada" | "Utilizada" | "Cancelada" };

export const initialCourtesies: Courtesy[] = [
  { id: "ct-1", eventId: "ev-baile", name: "Imprensa — Jornal da Cidade", email: "pauta@jornal.com", type: "VIP", quantity: 2, status: "Enviada" },
  { id: "ct-2", eventId: "ev-baile", name: "DJ Convidada", email: "dj@email.com", type: "Camarote", quantity: 4, status: "Utilizada" },
  { id: "ct-3", eventId: "ev-fabrica", name: "Parceria Rádio Bass", email: "radio@email.com", type: "Pista", quantity: 3, status: "Enviada" },
];

export type Promoter = {
  id: string;
  eventId: string;
  name: string;
  whatsapp: string;
  code: string;
  commissionKind: "none" | "percent" | "fixed";
  commission: number;
  clicks: number;
  sold: number;
  revenue: number;
  paid: boolean;
};

export const initialPromoters: Promoter[] = [
  { id: "pm-1", eventId: "ev-baile", name: "Leo Prado", whatsapp: "(31) 98888-1010", code: "LEO10", commissionKind: "percent", commission: 10, clicks: 1240, sold: 86, revenue: 6020, paid: true },
  { id: "pm-2", eventId: "ev-baile", name: "Duda Nunes", whatsapp: "(31) 98888-2020", code: "DUDA20", commissionKind: "fixed", commission: 5, clicks: 880, sold: 61, revenue: 4270, paid: false },
  { id: "pm-3", eventId: "ev-baile", name: "Rafa Teixeira", whatsapp: "(31) 98888-3030", code: "RAFA", commissionKind: "none", commission: 0, clicks: 640, sold: 38, revenue: 2660, paid: false },
  { id: "pm-4", eventId: "ev-baile", name: "Bia Santos", whatsapp: "(31) 98888-4040", code: "BIA15", commissionKind: "percent", commission: 15, clicks: 410, sold: 25, revenue: 1750, paid: false },
  { id: "pm-5", eventId: "ev-baile", name: "Caio Almeida", whatsapp: "(31) 98888-5050", code: "CAIO", commissionKind: "fixed", commission: 4, clicks: 210, sold: 12, revenue: 840, paid: false },
];

export type GateUser = { id: string; eventId: string; name: string; username: string; password: string; active: boolean; checkins: number };

export const initialGateUsers: GateUser[] = [
  { id: "gt-1", eventId: "ev-baile", name: "Portaria A", username: "violeta.portaria1", password: "Ent4-9K2M", active: true, checkins: 312 },
  { id: "gt-2", eventId: "ev-baile", name: "Portaria B", username: "violeta.portaria2", password: "Ent4-7Q5X", active: true, checkins: 188 },
];

export const promoterDailySales = (promoter: Promoter) => {
  seed = promoter.code.length * 31 + 5;
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * day);
    return {
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      tickets: Math.round(rnd() * (promoter.sold / 8)),
      value: Math.round(rnd() * (promoter.revenue / 8)),
    };
  });
};

export const randomPassword = () =>
  `Ent4-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const randomPromoCode = (name: string) =>
  `${name.split(" ")[0]?.toUpperCase().slice(0, 6) ?? "ENTRO"}${Math.floor(10 + Math.random() * 89)}`;

export const csvDownload = (filename: string, rows: (string | number)[][]) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const cepLookup = (cep: string) => {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return { address: "Rua Sapucaí", district: "Floresta", city: "Belo Horizonte", state: "MG" };
};
