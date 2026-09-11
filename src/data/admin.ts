import { genres as producerGenres, initialEvents } from "@/data/producer";

/** Todos os dados abaixo são fictícios e ficam apenas no front-end (painel interno da Entrô). */

export const ADMIN_EMAIL = "admin@jaentro.com.br";
export const ADMIN_PASSWORD = "teste123";

export const cities = ["Belo Horizonte", "São Paulo", "Rio de Janeiro", "Curitiba", "Recife", "Porto Alegre"];
export const genres = producerGenres;

export type FeeSettings = {
  pixFee: number;
  pixMin: number;
  cardFee: number;
  cardMin: number;
  advanceFee: number;
  anticipationMargin: number;
  holdPercent: number;
  holdDays: number;
  payoutHours: number;
  pixAdvanceLimit: number;
  cancelFee: number;
};

export const defaultFees: FeeSettings = {
  pixFee: 0.07,
  pixMin: 3.5,
  cardFee: 0.08,
  cardMin: 3.99,
  advanceFee: 0.0299,
  anticipationMargin: 0.01,
  holdPercent: 0.1,
  holdDays: 30,
  payoutHours: 48,
  pixAdvanceLimit: 0.5,
  cancelFee: 0.1,
};

const day = 86400000;
const iso = (offsetDays: number, hour = 20) => {
  const d = new Date(Date.now() + offsetDays * day);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

/* ---------- gerador determinístico (mesmo padrão de src/data/producer.ts) ---------- */
let seed = 777;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]!;

const firstNames = ["Marina", "Lucas", "Bia", "Rafael", "Camila", "Diego", "Juliana", "Pedro", "Aline", "Thiago", "Larissa", "Gustavo", "Renata", "Vitor", "Sabrina", "Caio", "Fernanda", "Bruno", "Isabela", "André"];
const lastNames = ["Rocha", "Duarte", "Almeida", "Santos", "Ferreira", "Lima", "Costa", "Barbosa", "Nunes", "Teixeira", "Moura", "Prado", "Cardoso", "Pires", "Araújo"];
const fantasyPrefixes = ["Coletivo", "Produtora", "Casa", "Agência", "Grupo"];
const fantasyWords = ["Alto-Falante", "Vibe", "Zona Sul", "Norte Fest", "Batuque", "Órbita", "Ponto Alto", "Vertigo", "Marola", "Cidade Viva", "Farol", "Trilha", "Setor 7", "Manada", "Trópico"];

const randomName = () => `${pick(firstNames)} ${pick(lastNames)}`;
const randomCpf = () => `${100 + Math.floor(rnd() * 800)}.${100 + Math.floor(rnd() * 800)}.${100 + Math.floor(rnd() * 800)}-${10 + Math.floor(rnd() * 80)}`;
const randomCnpj = () => `${10 + Math.floor(rnd() * 89)}.${100 + Math.floor(rnd() * 800)}.${100 + Math.floor(rnd() * 800)}/0001-${10 + Math.floor(rnd() * 80)}`;

/* ---------- produtores ---------- */

export type ProducerType = "PF" | "PJ";
export type ProducerVerification = "Aprovado" | "Em análise" | "Recusado";
export type AdminProducer = {
  id: string;
  name: string;
  type: ProducerType;
  document: string;
  email: string;
  whatsapp: string;
  city: string;
  verification: ProducerVerification;
  blocked: boolean;
  blockReason: string;
  risk: boolean;
  eventsCount: number;
  volume: number;
  balance: number;
  createdAt: string;
  documents: { name: string; sentAt: string; kind: "Documento com foto" | "Selfie" | "Comprovante de endereço" | "Contrato social" }[];
};

const producerNames = fantasyWords.map((w, i) => `${fantasyPrefixes[i % fantasyPrefixes.length]} ${w}`);

export const producers: AdminProducer[] = (() => {
  seed = 1001;
  const list: AdminProducer[] = [];
  list.push({
    id: "prod-altofalante",
    name: "Coletivo Alto-Falante",
    type: "PJ",
    document: "12.345.678/0001-90",
    email: "contato@altofalante.com.br",
    whatsapp: "(31) 99123-4455",
    city: "Belo Horizonte",
    verification: "Aprovado",
    blocked: false,
    blockReason: "",
    risk: false,
    eventsCount: 3,
    volume: 214500,
    balance: 18420.55,
    createdAt: iso(-420, 10),
    documents: [
      { name: "contrato-social.pdf", sentAt: iso(-419, 9), kind: "Contrato social" },
      { name: "rg-responsavel.jpg", sentAt: iso(-419, 9), kind: "Documento com foto" },
    ],
  });
  for (let i = 0; i < 14; i++) {
    const isPJ = rnd() < 0.55;
    const verification: ProducerVerification = i === 1 || i === 2 ? "Em análise" : i === 3 ? "Recusado" : "Aprovado";
    const blocked = i === 4;
    const risk = !blocked && rnd() < 0.15;
    const name = isPJ ? producerNames[i % producerNames.length]! : randomName();
    const volume = Math.round(4000 + rnd() * 180000);
    list.push({
      id: `prod-${i}`,
      name,
      type: isPJ ? "PJ" : "PF",
      document: isPJ ? randomCnpj() : randomCpf(),
      email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@email.com`,
      whatsapp: `(${11 + Math.floor(rnd() * 80)}) 9${8000 + Math.floor(rnd() * 1000)}-${1000 + Math.floor(rnd() * 8999)}`,
      city: pick(cities),
      verification,
      blocked,
      blockReason: blocked ? "Suspeita de fraude em vendas recentes" : "",
      risk,
      eventsCount: Math.max(1, Math.round(rnd() * 4)),
      volume,
      balance: Math.round(volume * (0.05 + rnd() * 0.2)),
      createdAt: iso(-Math.round(30 + rnd() * 500), 9),
      documents:
        verification === "Recusado"
          ? []
          : [
              { name: isPJ ? "contrato-social.pdf" : "rg-frente.jpg", sentAt: iso(-Math.round(20 + rnd() * 400), 9), kind: isPJ ? "Contrato social" : "Documento com foto" },
              { name: "selfie-verificacao.jpg", sentAt: iso(-Math.round(20 + rnd() * 400), 9), kind: "Selfie" },
              { name: "comprovante-endereco.pdf", sentAt: iso(-Math.round(20 + rnd() * 400), 9), kind: "Comprovante de endereço" },
            ],
    });
  }
  return list;
})();

/* ---------- eventos ---------- */

export type AdminEventStatus = "Rascunho" | "Publicado" | "Encerrado" | "Cancelado" | "Suspenso";
export type AdminEvent = {
  id: string;
  slug: string;
  name: string;
  genre: string;
  city: string;
  producerId: string;
  status: AdminEventStatus;
  suspendReason: string;
  featured: boolean;
  startAt: string;
  createdAt: string;
  ticketsSold: number;
  capacity: number;
  volume: number;
};

const eventNameWords = ["Baile", "Festival", "Noite", "Rave", "Show", "Encontro", "Arraiá", "Open Bar", "Sunset", "Warm Up"];
const eventNameThemes = ["Violeta", "Elétrica", "do Cerrado", "das Águas", "Underground", "da Serra", "Tropical", "da Lapa", "Metropolitana", "do Porto"];

export const events: AdminEvent[] = (() => {
  seed = 2002;
  const list: AdminEvent[] = [];
  for (const ev of initialEvents) {
    const capacity = 600 + Math.round(rnd() * 800);
    const sold = Math.round(capacity * (0.3 + rnd() * 0.6));
    list.push({
      id: ev.id,
      slug: ev.slug,
      name: ev.name,
      genre: ev.genre,
      city: ev.city,
      producerId: "prod-altofalante",
      status: ev.status === "Publicado" ? "Publicado" : ev.status === "Encerrado" ? "Encerrado" : ev.status === "Cancelado" ? "Cancelado" : "Rascunho",
      suspendReason: "",
      featured: ev.id === "ev-baile",
      startAt: ev.startAt,
      createdAt: iso(-60, 10),
      ticketsSold: sold,
      capacity,
      volume: Math.round(sold * (60 + rnd() * 120)),
    });
  }
  const statuses: AdminEventStatus[] = ["Publicado", "Publicado", "Publicado", "Encerrado", "Rascunho", "Cancelado", "Suspenso"];
  while (list.length < 30) {
    const producer = pick(producers);
    const capacity = 200 + Math.round(rnd() * 1500);
    const status = pick(statuses);
    const sold = status === "Rascunho" ? 0 : Math.round(capacity * (0.1 + rnd() * 0.85));
    const startOffset = status === "Encerrado" ? -Math.round(rnd() * 90) : Math.round(rnd() * 90) - 5;
    list.push({
      id: `ev-gen-${list.length}`,
      slug: `evento-${list.length}`,
      name: `${pick(eventNameWords)} ${pick(eventNameThemes)}`,
      genre: pick(genres),
      city: pick(cities),
      producerId: producer.id,
      status,
      suspendReason: status === "Suspenso" ? "Denúncias de venda de ingressos falsificados" : "",
      featured: false,
      startAt: iso(startOffset, 21),
      createdAt: iso(startOffset - Math.round(20 + rnd() * 40), 10),
      ticketsSold: sold,
      capacity,
      volume: Math.round(sold * (40 + rnd() * 160)),
    });
  }
  return list;
})();

export const eventById = (id: string) => events.find((e) => e.id === id);
export const producerById = (id: string) => producers.find((p) => p.id === id);
export const producerEvents = (id: string) => events.filter((e) => e.producerId === id);

/* ---------- pedidos ---------- */

export type OrderHistoryEntry = { at: string; label: string };
export type AdminOrder = {
  id: string;
  number: string;
  buyer: string;
  email: string;
  cpf: string;
  eventId: string;
  tickets: number;
  ticketDescription: string;
  payment: "Pix" | "Cartão";
  installments: number;
  gross: number;
  fee: number;
  net: number;
  status: "Pago" | "Reembolsado" | "Chargeback" | "Cancelado";
  purchasedAt: string;
  history: OrderHistoryEntry[];
};

export const pixFeeCalc = (v: number, fees: FeeSettings = defaultFees) => Math.max(fees.pixMin, v * fees.pixFee);
export const cardFeeCalc = (v: number, fees: FeeSettings = defaultFees) => Math.max(fees.cardMin, v * fees.cardFee);

export const orders: AdminOrder[] = (() => {
  seed = 3003;
  const list: AdminOrder[] = [];
  const publishedEvents = events.filter((e) => e.status !== "Rascunho");
  for (let i = 0; i < 60; i++) {
    const event = pick(publishedEvents);
    const payment: AdminOrder["payment"] = rnd() < 0.6 ? "Pix" : "Cartão";
    const tickets = 1 + Math.floor(rnd() * 4);
    const gross = Math.round(tickets * (40 + rnd() * 160));
    const fee = payment === "Pix" ? pixFeeCalc(gross) : cardFeeCalc(gross);
    const statusRoll = rnd();
    const status: AdminOrder["status"] = statusRoll < 0.86 ? "Pago" : statusRoll < 0.94 ? "Reembolsado" : statusRoll < 0.98 ? "Chargeback" : "Cancelado";
    const purchasedAt = iso(-Math.round(rnd() * 60), 14);
    const history: OrderHistoryEntry[] = [{ at: purchasedAt, label: "Compra confirmada" }];
    if (payment === "Pix" && rnd() < 0.5) history.push({ at: iso(-Math.round(rnd() * 20), 12), label: "Repasse liberado ao produtor" });
    if (status === "Reembolsado") history.push({ at: iso(-Math.round(rnd() * 10), 15), label: "Reembolso processado" });
    if (status === "Chargeback") history.push({ at: iso(-Math.round(rnd() * 8), 16), label: "Chargeback recebido do adquirente" });
    if (new Date(event.startAt).getTime() < Date.now() && status === "Pago" && rnd() < 0.7)
      history.push({ at: event.startAt, label: "Check-in realizado" });
    list.push({
      id: `ord-${i}`,
      number: `ENTRO-${100000 + i}`,
      buyer: randomName(),
      email: `comprador${i + 1}@email.com`,
      cpf: randomCpf(),
      eventId: event.id,
      tickets,
      ticketDescription: `${tickets}x Pista`,
      payment,
      installments: payment === "Cartão" ? pick([1, 1, 2, 3, 6]) : 1,
      gross,
      fee: Number(fee.toFixed(2)),
      net: Number((gross - fee).toFixed(2)),
      status,
      purchasedAt,
      history,
    });
  }
  return list.sort((a, b) => +new Date(b.purchasedAt) - +new Date(a.purchasedAt));
})();

export const orderById = (id: string) => orders.find((o) => o.id === id);

/* ---------- reembolsos ---------- */

export type AdminRefund = {
  id: string;
  orderId: string;
  buyer: string;
  eventId: string;
  rule: "Arrependimento em 7 dias" | "Cancelamento com taxa" | "Evento cancelado";
  amount: number;
  status: "Processando" | "Concluído" | "Recusado";
  requestedAt: string;
};

export const refunds: AdminRefund[] = (() => {
  seed = 4004;
  const refundOrders = orders.filter((o) => o.status === "Reembolsado");
  return refundOrders.map((o, i) => ({
    id: `rf-${i}`,
    orderId: o.id,
    buyer: o.buyer,
    eventId: o.eventId,
    rule: pick(["Arrependimento em 7 dias", "Cancelamento com taxa", "Evento cancelado"] as const),
    amount: Math.round(o.gross * (0.7 + rnd() * 0.3)),
    status: pick(["Concluído", "Concluído", "Processando"] as const),
    requestedAt: iso(-Math.round(rnd() * 30), 15),
  }));
})();

/* ---------- chargebacks ---------- */

export type ChargebackStatus = "Aberto" | "Em defesa" | "Ganho" | "Perdido";
export type ChargebackDefense = {
  cpfConfirmed: boolean;
  emailConfirmed: boolean;
  termsAcceptedAt: string;
  checkin: { at: string; gate: string; device: string } | null;
  extraDocuments: string[];
  sentAt: string | null;
};
export type AdminChargeback = {
  id: string;
  orderId: string;
  buyer: string;
  eventId: string;
  amount: number;
  openedAt: string;
  deadline: string;
  status: ChargebackStatus;
  defense: ChargebackDefense;
};

export const chargebacks: AdminChargeback[] = (() => {
  const cbOrders = orders.filter((o) => o.status === "Chargeback");
  const base: AdminChargeback[] = [];
  const mk = (order: AdminOrder | undefined, status: ChargebackStatus, openedDaysAgo: number, deadlineDays: number): AdminChargeback => {
    const o = order ?? orders[0]!;
    return {
      id: `cb-${base.length}`,
      orderId: o.id,
      buyer: o.buyer,
      eventId: o.eventId,
      amount: o.gross,
      openedAt: iso(-openedDaysAgo, 11),
      deadline: iso(deadlineDays, 23),
      status,
      defense: {
        cpfConfirmed: status !== "Aberto",
        emailConfirmed: status !== "Aberto",
        termsAcceptedAt: o.purchasedAt,
        checkin: status === "Aberto" ? null : { at: o.purchasedAt, gate: "Portaria A", device: "Tablet Portaria #2" },
        extraDocuments: status === "Aberto" ? [] : ["nota-fiscal.pdf"],
        sentAt: status === "Ganho" || status === "Perdido" ? iso(-openedDaysAgo + 2, 12) : null,
      },
    };
  };
  base.push(mk(cbOrders[0], "Aberto", 6, 4));
  base.push(mk(cbOrders[1], "Ganho", 25, -15));
  base.push(mk(cbOrders[2], "Perdido", 40, -30));
  return base;
})();

/* ---------- financeiro (tudo calculado a partir das taxas) ---------- */

export const platformRevenue = (fees: FeeSettings = defaultFees) => {
  const pixOrders = orders.filter((o) => o.payment === "Pix" && o.status !== "Cancelado");
  const cardOrders = orders.filter((o) => o.payment === "Cartão" && o.status !== "Cancelado");
  const pixFeeRevenue = pixOrders.reduce((s, o) => s + pixFeeCalc(o.gross, fees), 0);
  const cardFeeRevenue = cardOrders.reduce((s, o) => s + cardFeeCalc(o.gross, fees), 0);
  const advanceRevenue = pixFeeRevenue * 0.18 * (fees.advanceFee / 0.0299);
  const anticipationMarginRevenue = cardFeeRevenue * 0.22 * (fees.anticipationMargin / 0.01);
  const grossRevenue = pixFeeRevenue + cardFeeRevenue + advanceRevenue + anticipationMarginRevenue;
  const asaasCost = pixOrders.length * 1.5 + cardOrders.reduce((s, o) => s + o.gross * 0.012, 0);
  const profit = grossRevenue - asaasCost;
  return {
    pixFeeRevenue: Number(pixFeeRevenue.toFixed(2)),
    cardFeeRevenue: Number(cardFeeRevenue.toFixed(2)),
    advanceRevenue: Number(advanceRevenue.toFixed(2)),
    anticipationMarginRevenue: Number(anticipationMarginRevenue.toFixed(2)),
    grossRevenue: Number(grossRevenue.toFixed(2)),
    asaasCost: Number(asaasCost.toFixed(2)),
    profit: Number(profit.toFixed(2)),
  };
};

export const revenueByDay = (() => {
  seed = 5005;
  const days: { date: string; label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * day);
    days.push({
      date: d.toISOString(),
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      value: Math.round(600 + rnd() * 2600),
    });
  }
  return days;
})();

export const salesByCity = cities.map((city) => ({
  city,
  volume: events.filter((e) => e.city === city).reduce((s, e) => s + e.volume, 0),
}));

export type Advance = { id: string; producerId: string; eventId: string; amount: number; grantedAt: string; eventDate: string };

export const advances: Advance[] = (() => {
  seed = 6006;
  const upcoming = events.filter((e) => e.status === "Publicado");
  return Array.from({ length: 8 }, (_, i) => {
    const event = pick(upcoming);
    return {
      id: `adv-${i}`,
      producerId: event.producerId,
      eventId: event.id,
      amount: Math.round(1000 + rnd() * 12000),
      grantedAt: iso(-Math.round(rnd() * 20), 10),
      eventDate: event.startAt,
    };
  });
})();

export type Hold = { id: string; eventId: string; producerId: string; amount: number; releaseAt: string };

export const holds: Hold[] = (() => {
  seed = 7007;
  return events
    .filter((e) => e.status === "Publicado" || e.status === "Encerrado")
    .slice(0, 10)
    .map((e, i) => ({
      id: `hold-${i}`,
      eventId: e.id,
      producerId: e.producerId,
      amount: Number((e.volume * 0.08 * defaultFees.holdPercent * 10).toFixed(2)),
      releaseAt: new Date(+new Date(e.startAt) + defaultFees.holdDays * day).toISOString(),
    }));
})();

export type PlatformWithdraw = { id: string; date: string; amount: number; destination: string };

export const platformWithdraws: PlatformWithdraw[] = [
  { id: "pw-1", date: iso(-30, 10), amount: 45000, destination: "Conta Entrô — Banco Inter" },
  { id: "pw-2", date: iso(-15, 10), amount: 32000, destination: "Conta Entrô — Banco Inter" },
  { id: "pw-3", date: iso(-3, 10), amount: 18000, destination: "Conta Entrô — Banco Inter" },
];

export const platformBalance = 128940.35;

/* ---------- equipe ---------- */

export type AdminRole = "Dono" | "Financeiro" | "Suporte";
export const roleScopes: Record<AdminRole, string> = {
  Dono: "Acesso total: financeiro, produtores, eventos, taxas e equipe.",
  Financeiro: "Vê e edita financeiro, taxas, adiantamentos e retenções. Não gerencia equipe.",
  Suporte: "Vê pedidos, produtores e eventos. Pode bloquear/suspender, mas não altera taxas nem finanças.",
};

export type AdminUser = { id: string; name: string; email: string; role: AdminRole };

export const initialAdminTeam: AdminUser[] = [
  { id: "adm-1", name: "Fernanda Cardoso", email: "fernanda@jaentro.com.br", role: "Dono" },
  { id: "adm-2", name: "Diego Prado", email: "diego@jaentro.com.br", role: "Financeiro" },
  { id: "adm-3", name: "Bianca Nunes", email: "bianca@jaentro.com.br", role: "Suporte" },
];

export type ActionLogEntry = { id: string; who: string; action: string; kind: "Bloqueio" | "Suspensão" | "Estorno" | "Taxa" | "Permissão" | "Outro"; at: string };

export const initialActionLog: ActionLogEntry[] = [
  { id: "log-1", who: "Fernanda Cardoso", action: "Bloqueou o produtor Grupo Vertigo por suspeita de fraude", kind: "Bloqueio", at: iso(-4, 9) },
  { id: "log-2", who: "Bianca Nunes", action: "Suspendeu o evento Rave Underground por denúncias", kind: "Suspensão", at: iso(-3, 14) },
  { id: "log-3", who: "Diego Prado", action: "Estornou o pedido ENTRO-100032 a pedido do comprador", kind: "Estorno", at: iso(-2, 11) },
  { id: "log-4", who: "Fernanda Cardoso", action: "Alterou a taxa do Pix de 6,5% para 7%", kind: "Taxa", at: iso(-20, 10) },
  { id: "log-5", who: "Fernanda Cardoso", action: "Convidou Bianca Nunes como Suporte", kind: "Permissão", at: iso(-90, 10) },
];

/* ---------- alertas ---------- */

export const highSalesAlerts = events.filter((e) => {
  const daysToEvent = (+new Date(e.startAt) - Date.now()) / day;
  return e.status === "Publicado" && daysToEvent > 0 && daysToEvent < 7 && e.ticketsSold / Math.max(1, e.capacity) > 0.7;
});
