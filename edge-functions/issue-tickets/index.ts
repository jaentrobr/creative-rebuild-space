// Edge Function: issue-tickets
// Emite ingressos GRATUITOS (lotes com preço 0) para o usuário autenticado.
// Deploy MANUAL no seu Supabase (copie esta pasta, incluindo ../_shared, para supabase/functions/):
//   supabase functions deploy issue-tickets
// Secrets necessários: nenhum além dos padrões do projeto (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
import { z } from "https://esm.sh/zod@3.23.8";
import { handleOptions, buildCorsHeaders } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/http.ts";
import { getAdminClient, getAuthedUser } from "../_shared/auth.ts";

const FN = "issue-tickets";

const holderSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    cpf: z
      .string()
      .trim()
      .regex(/^\d{11}$/)
      .optional(),
    email: z.string().trim().email().max(160).optional(),
  })
  .strict();

const itemSchema = z
  .object({
    lot_id: z.string().uuid(),
    holders: z.array(holderSchema).min(1).max(20),
  })
  .strict();

const bodySchema = z
  .object({
    event_id: z.string().uuid(),
    items: z.array(itemSchema).min(1).max(10),
  })
  .strict();

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;
  if (req.method !== "POST") return errorResponse(req, FN, "E_METHOD", 405);

  try {
    const user = await getAuthedUser(req);
    if (!user) return errorResponse(req, FN, "E_UNAUTHENTICATED", 401);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse(req, FN, "E_INVALID_BODY", 400);
    }
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) return errorResponse(req, FN, "E_VALIDATION", 400);
    const { event_id, items } = parsed.data;

    const totalRequested = items.reduce((sum, item) => sum + item.holders.length, 0);
    if (totalRequested <= 0) return errorResponse(req, FN, "E_VALIDATION", 400);

    const admin = getAdminClient();

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, status")
      .eq("id", event_id)
      .maybeSingle();
    if (eventError) return errorResponse(req, FN, "E_INTERNAL", 500, eventError);
    if (!event || event.status !== "published") {
      return errorResponse(req, FN, "E_EVENT_NOT_FOUND", 404);
    }

    const lotIds = items.map((i) => i.lot_id);
    const { data: lots, error: lotsError } = await admin
      .from("lots")
      .select("id, event_id, price, quantity, sold_count, max_per_order")
      .in("id", lotIds);
    if (lotsError) return errorResponse(req, FN, "E_INTERNAL", 500, lotsError);
    const lotMap = new Map((lots ?? []).map((l) => [l.id, l]));

    for (const item of items) {
      const lot = lotMap.get(item.lot_id);
      if (!lot || lot.event_id !== event_id) {
        return errorResponse(req, FN, "E_LOT_NOT_FOUND", 404);
      }
      if (Number(lot.price) !== 0) {
        return errorResponse(req, FN, "E_LOT_NOT_FREE", 422);
      }
      const remaining = Number(lot.quantity) - Number(lot.sold_count);
      if (item.holders.length > remaining) {
        return errorResponse(req, FN, "E_SOLD_OUT", 422);
      }
    }

    // Limite total de ingressos gratuitos por usuário/evento, somando pedidos anteriores.
    const { count: alreadyIssued, error: countError } = await admin
      .from("tickets")
      .select("id, orders!inner(buyer_id)", { count: "exact", head: true })
      .eq("event_id", event_id)
      .eq("orders.buyer_id", user.id)
      .neq("status", "canceled");
    if (countError) return errorResponse(req, FN, "E_INTERNAL", 500, countError);

    const smallestMaxPerOrder = Math.min(
      ...items.map((item) => Number(lotMap.get(item.lot_id)!.max_per_order || 1)),
    );
    const totalAfter = (alreadyIssued ?? 0) + totalRequested;
    if (totalAfter > smallestMaxPerOrder) {
      return errorResponse(req, FN, "E_LIMIT_EXCEEDED", 422);
    }

    const orderCode = `FREE-${Date.now().toString(36).toUpperCase()}`;
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        code: orderCode,
        buyer_id: user.id,
        event_id,
        status: "paid",
        payment_method: "free",
        installments: 1,
        subtotal: 0,
        discount: 0,
        service_fee: 0,
        interest: 0,
        total: 0,
        paid_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (orderError || !order) return errorResponse(req, FN, "E_INTERNAL", 500, orderError);

    const ticketsToInsert: Record<string, unknown>[] = [];
    for (const item of items) {
      const lot = lotMap.get(item.lot_id)!;
      const { data: ticketType } = await admin
        .from("lots")
        .select("ticket_type_id")
        .eq("id", item.lot_id)
        .maybeSingle();
      for (const holder of item.holders) {
        ticketsToInsert.push({
          order_id: order.id,
          event_id,
          ticket_type_id: ticketType?.ticket_type_id,
          lot_id: item.lot_id,
          holder_user_id: user.id,
          holder_name: holder.name,
          holder_email: holder.email ?? user.email,
          holder_cpf: holder.cpf ?? null,
          is_half_price: false,
          price: 0,
          status: "valid",
        });
      }
    }

    const { data: insertedTickets, error: ticketsError } = await admin
      .from("tickets")
      .insert(ticketsToInsert)
      .select("id, qr_token, holder_name");
    if (ticketsError) return errorResponse(req, FN, "E_INTERNAL", 500, ticketsError);

    for (const item of items) {
      const lot = lotMap.get(item.lot_id)!;
      await admin
        .from("lots")
        .update({ sold_count: Number(lot.sold_count) + item.holders.length })
        .eq("id", item.lot_id);
    }

    return jsonResponse(req, {
      order_id: order.id,
      tickets: (insertedTickets ?? []).map((t) => ({ id: t.id, qr_token: t.qr_token })),
    });
  } catch (error) {
    return errorResponse(req, FN, "E_INTERNAL", 500, error);
  }
});
