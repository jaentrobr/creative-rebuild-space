import { findEvent } from "@/data/events";

export type TicketStatus = "Válido" | "Utilizado" | "Transferido" | "Reembolsado";

export type DemoTicket = {
  id: string;
  orderId: string;
  eventSlug: string;
  holder: string;
  holderDoc: string;
  type: string;
  lot: string;
  half: boolean;
  price: number;
  fee: number;
  status: TicketStatus;
  purchasedAt: string;
  eventAt: string;
  code: string;
};

export type DemoOrder = {
  id: string;
  number: string;
  eventSlug: string;
  purchasedAt: string;
  quantity: number;
  payment: string;
  subtotal: number;
  fee: number;
  total: number;
};

export const demoUser = {
  name: "Marina Rocha",
  cpf: "123.456.789-00",
  email: "marina.rocha@email.com",
  phone: "(31) 99876-5432",
  initials: "MR",
};

const hours = (value: number) => new Date(Date.now() + value * 3600000).toISOString();
const days = (value: number) => hours(value * 24);

export const demoTickets: DemoTicket[] = [
  {
    id: "ing-1",
    orderId: "ped-1",
    eventSlug: "fabrica-de-bass",
    holder: demoUser.name,
    holderDoc: demoUser.cpf,
    type: "Meia-entrada",
    lot: "2º lote",
    half: true,
    price: 45,
    fee: 3.5,
    status: "Válido",
    purchasedAt: days(-22),
    eventAt: days(25),
    code: "ENTRO-9F2K-4821",
  },
  {
    id: "ing-2",
    orderId: "ped-2",
    eventSlug: "open-bar-tropical",
    holder: demoUser.name,
    holderDoc: demoUser.cpf,
    type: "Inteira",
    lot: "2º lote",
    half: false,
    price: 135,
    fee: 9.45,
    status: "Válido",
    purchasedAt: days(-2),
    eventAt: days(30),
    code: "ENTRO-7C1M-5530",
  },
  {
    id: "ing-3",
    orderId: "ped-3",
    eventSlug: "baile-violeta",
    holder: demoUser.name,
    holderDoc: demoUser.cpf,
    type: "Inteira",
    lot: "Lote final",
    half: false,
    price: 60,
    fee: 4.2,
    status: "Válido",
    purchasedAt: days(-10),
    eventAt: hours(30),
    code: "ENTRO-3T8P-1194",
  },
  {
    id: "ing-4",
    orderId: "ped-4",
    eventSlug: "samba-da-lapa",
    holder: demoUser.name,
    holderDoc: demoUser.cpf,
    type: "Inteira",
    lot: "1º lote",
    half: false,
    price: 30,
    fee: 3.5,
    status: "Utilizado",
    purchasedAt: days(-60),
    eventAt: days(-15),
    code: "ENTRO-5D4Q-7702",
  },
  {
    id: "ing-5",
    orderId: "ped-5",
    eventSlug: "roda-curitibana",
    holder: "Camila Duarte",
    holderDoc: "987.654.321-00",
    type: "Inteira",
    lot: "2º lote",
    half: false,
    price: 35,
    fee: 3.5,
    status: "Transferido",
    purchasedAt: days(-45),
    eventAt: days(-8),
    code: "ENTRO-1L6R-3348",
  },
];

export const demoOrders: DemoOrder[] = demoTickets.map((ticket, index) => {
  const quantity = index === 1 ? 2 : 1;
  const subtotal = ticket.price * quantity;
  const fee = ticket.fee * quantity;
  return {
    id: ticket.orderId,
    number: `#ENT-${1200 + index}`,
    eventSlug: ticket.eventSlug,
    purchasedAt: ticket.purchasedAt,
    quantity,
    payment: index % 2 === 0 ? "Pix" : "Cartão em 3x",
    subtotal,
    fee,
    total: subtotal + fee,
  };
});

export const ticketEvent = (ticket: DemoTicket) => findEvent(ticket.eventSlug);

export type RefundPolicy = { kind: "full" | "partial" | "none"; amount: number; text: string };

export function refundPolicy(ticket: DemoTicket): RefundPolicy {
  const paid = ticket.price + ticket.fee;
  if (ticket.status !== "Válido") {
    return { kind: "none", amount: 0, text: "Este ingresso não está mais ativo, então não pode ser reembolsado." };
  }
  const hoursToEvent = (new Date(ticket.eventAt).getTime() - Date.now()) / 3600000;
  const daysSincePurchase = (Date.now() - new Date(ticket.purchasedAt).getTime()) / 86400000;
  if (hoursToEvent < 48) {
    return { kind: "none", amount: 0, text: "Falta menos de 48 horas para o evento, então o reembolso não está mais disponível." };
  }
  if (daysSincePurchase <= 7) {
    return { kind: "full", amount: paid, text: "Você comprou há menos de 7 dias e faltam mais de 48 horas para o evento: devolvemos tudo." };
  }
  return {
    kind: "partial",
    amount: Number((ticket.price * 0.9).toFixed(2)),
    text: "Passaram-se mais de 7 dias da compra. O produtor permite cancelar com taxa de 10%; a taxa de serviço não volta.",
  };
}

export const randomCode = () =>
  `ENTRO-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}`;
