import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  AlertTriangle,
  Loader2,
  LogIn,
  ShieldCheck,
  Tag,
  Ticket as TicketIcon,
} from "lucide-react";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/page-shell";
import { brl } from "@/lib/format";

type EventRow = Tables<"events">;
type LotRow = Tables<"lots">;
type TicketTypeRow = Tables<"ticket_types">;
type EventWithLots = EventRow & { lots: LotRow[]; ticket_types: TicketTypeRow[] };

const schema = z.object({
  event: z.string().catch(""),
  // JSON serializado de { [lotId]: quantidade }, ex.: {"lot-1":2,"lot-2":1}
  lots: z.string().optional().catch(""),
  // Compatibilidade com o fluxo antigo, que envia apenas total e meia-entrada.
  total: z.coerce.number().optional().catch(0),
  half: z.coerce.boolean().optional().catch(false),
  ref: z.string().optional().catch(""),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (search) => schema.parse(search),
  head: () => ({
    meta: [
      { title: "Checkout — Entrô" },
      { name: "description", content: "Finalize seu ingresso com segurança na Entrô." },
      { property: "og:title", content: "Checkout — Entrô" },
      { property: "og:description", content: "Finalize seu ingresso na Entrô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

type SelectionItem = {
  key: string;
  name: string;
  price: number;
  qty: number;
  half: boolean;
};

type CouponState = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  message: string;
} | null;

function parseSelection(raw: string | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const qty = Number(value);
      if (Number.isFinite(qty) && qty > 0) out[key] = qty;
    }
    return out;
  } catch {
    return {};
  }
}

function CheckoutPage() {
  const search = Route.useSearch();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventWithLots | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");

  const [method, setMethod] = useState<"pix" | "card">("pix");

  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponState>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!search.event) {
      setEvent(null);
      setEventLoading(false);
      setEventError("Nenhum evento informado.");
      return;
    }
    setEventLoading(true);
    setEventError("");
    void (async () => {
      const { data, error } = await db
        .from("events")
        .select("*, ticket_types(*), lots(*)")
        .eq("slug", search.event)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setEventError("Não foi possível carregar este evento.");
        setEvent(null);
      } else {
        setEvent(data as unknown as EventWithLots);
      }
      setEventLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [search.event]);

  const selectionMap = useMemo(() => parseSelection(search.lots), [search.lots]);

  const items: SelectionItem[] = useMemo(() => {
    if (!event) return [];
    const lots = event.lots ?? [];
    const ticketTypes = event.ticket_types ?? [];
    const fromLots = lots
      .filter((lot) => (selectionMap[lot.id] ?? 0) > 0)
      .map((lot) => {
        const ticketType = ticketTypes.find((tt) => tt.id === lot.ticket_type_id);
        return {
          key: lot.id,
          name: ticketType ? `${ticketType.name} — ${lot.name}` : lot.name,
          price: Number(lot.price),
          qty: selectionMap[lot.id] ?? 0,
          half: !!ticketType?.has_half_price && !!search.half,
        };
      });
    if (fromLots.length > 0) return fromLots;
    // Compatibilidade com links antigos que só enviam total/half agregados.
    if (search.total && search.total > 0) {
      return [
        {
          key: "legacy",
          name: "Ingressos selecionados",
          price: search.total,
          qty: 1,
          half: !!search.half,
        },
      ];
    }
    return [];
  }, [event, selectionMap, search.total, search.half]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );
  const hasHalf = items.some((item) => item.half && item.qty > 0);

  const discount = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.discountType === "percent") return subtotal * (coupon.discountValue / 100);
    return Math.min(subtotal, coupon.discountValue);
  }, [coupon, subtotal]);

  const discountedSubtotal = Math.max(0, subtotal - discount);

  const fee = useMemo(() => {
    if (!event || discountedSubtotal <= 0) return 0;
    if (method === "pix") {
      return Math.max(
        Number(event.fee_pix_min ?? 0),
        discountedSubtotal * (Number(event.fee_pix_percent ?? 0) / 100),
      );
    }
    return Math.max(
      Number(event.fee_card_min ?? 0),
      discountedSubtotal * (Number(event.fee_card_percent ?? 0) / 100),
    );
  }, [event, discountedSubtotal, method]);

  const feePaidByBuyer = event?.fee_payer !== "producer";
  const total = discountedSubtotal + (feePaidByBuyer ? fee : 0);

  const redirectSearch = {
    redirect: "/checkout",
    event: search.event,
    total: search.total ?? 0,
    half: search.half ?? false,
    ref: search.ref ?? "",
  };

  const applyCoupon = async () => {
    if (!event || !couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    const { data, error } = await db.rpc("validate_coupon", {
      p_event_id: event.id,
      p_code: couponCode.trim(),
    });
    setCouponLoading(false);
    if (error) {
      setCouponError("Não foi possível validar o cupom agora.");
      setCoupon(null);
      return;
    }
    const result = (data ?? {}) as Record<string, unknown>;
    const valid = result["valid"] !== false;
    if (!valid) {
      setCouponError((result["message"] as string) || "Cupom inválido ou expirado.");
      setCoupon(null);
      return;
    }
    const discountType = result["discount_type"] === "fixed" ? "fixed" : "percent";
    const discountValue = Number(result["discount_value"] ?? 0);
    setCoupon({
      code: couponCode.trim(),
      discountType,
      discountValue,
      message: (result["message"] as string) || "Cupom aplicado!",
    });
  };

  if (eventLoading) {
    return (
      <PageShell className="max-w-5xl">
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Carregando checkout…
        </div>
      </PageShell>
    );
  }

  if (eventError || !event) {
    return (
      <PageShell className="max-w-2xl text-center">
        <h1 className="text-3xl font-bold">Evento não encontrado</h1>
        <p className="mt-3 text-muted-foreground">
          {eventError || "Verifique o link e tente novamente."}
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/">Ver eventos</Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-5xl">
      <h1 className="text-4xl font-bold">Finalizar compra</h1>
      <p className="mt-2 text-muted-foreground">{event.title}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <TicketIcon className="size-5 text-primary" /> Ingressos
            </h2>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum ingresso selecionado. Volte ao evento para escolher seus ingressos.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-muted-foreground">
                        {item.qty}x {brl(item.price)}
                        {item.half && " · meia-entrada"}
                      </p>
                    </div>
                    <strong>{brl(item.price * item.qty)}</strong>
                  </div>
                ))}
              </div>
            )}
            {hasHalf && (
              <p className="mt-4 rounded-lg bg-sun/30 p-3 text-sm font-semibold">
                Apresente documento de meia-entrada na entrada do evento.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Tag className="size-5 text-primary" /> Cupom de desconto
            </h2>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Código do cupom"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyCoupon}
                disabled={couponLoading || !couponCode.trim()}
              >
                {couponLoading ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>
            {coupon && <p className="mt-2 text-sm font-semibold text-primary">{coupon.message}</p>}
            {couponError && (
              <p className="mt-2 text-sm font-semibold text-destructive">{couponError}</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-xl font-bold">Forma de pagamento</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("pix")}
                className={`rounded-xl border-2 p-4 text-left ${method === "pix" ? "border-primary bg-secondary" : "border-border"}`}
              >
                <strong>Pix</strong>
                <p className="text-sm text-muted-foreground">
                  Taxa de {Number(event.fee_pix_percent ?? 0)}% (mín.{" "}
                  {brl(Number(event.fee_pix_min ?? 0))})
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`rounded-xl border-2 p-4 text-left ${method === "card" ? "border-primary bg-secondary" : "border-border"}`}
              >
                <strong>Cartão</strong>
                <p className="text-sm text-muted-foreground">
                  Taxa de {Number(event.fee_card_percent ?? 0)}% (mín.{" "}
                  {brl(Number(event.fee_card_min ?? 0))})
                </p>
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {feePaidByBuyer
                ? "A taxa de serviço é paga pelo comprador."
                : "A taxa de serviço é paga pelo produtor deste evento."}
            </p>
          </section>

          <section className="rounded-xl border border-dashed border-primary/60 bg-secondary/40 p-5">
            <p className="flex items-center gap-2 font-bold text-ink">
              <AlertTriangle className="size-5 text-primary" /> Pagamento ainda não disponível
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos finalizando a integração de pagamentos. Por enquanto não é possível concluir a
              compra nesta tela.
            </p>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="text-2xl font-bold">Resumo</h2>
          <p className="mt-4 font-bold">{event.title}</p>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{brl(subtotal)}</span>
            </div>
            {coupon && (
              <div className="flex justify-between text-primary">
                <span>Desconto ({coupon.code})</span>
                <span>-{brl(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Taxa de serviço ({method === "pix" ? "Pix" : "cartão"})</span>
              <span>{feePaidByBuyer ? brl(fee) : "Grátis"}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span>{brl(total)}</span>
            </div>
          </div>

          {!authLoading && !user ? (
            <div className="mt-5 rounded-lg bg-secondary p-3 text-sm">
              <p className="font-semibold">Entre na sua conta para continuar.</p>
              <Button asChild size="sm" className="mt-3 w-full">
                <Link to="/entrar" search={redirectSearch as never}>
                  <LogIn className="size-4" /> Entrar para continuar
                </Link>
              </Button>
            </div>
          ) : (
            <Button
              className="mt-5 w-full"
              size="lg"
              disabled
              title="Pagamento ainda não disponível"
            >
              Pagamento ainda não disponível
            </Button>
          )}

          <p className="mt-5 flex gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" /> Seus dados estão protegidos. Nenhuma
            cobrança é feita nesta etapa.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
