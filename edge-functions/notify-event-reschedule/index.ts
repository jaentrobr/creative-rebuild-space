// Edge Function: notify-event-reschedule
// Deploy MANUAL (copie esta pasta, incluindo ../_shared, para supabase/functions/):
//   supabase functions deploy notify-event-reschedule
// Secrets necessários: RESEND_API_KEY, SITE_URL
import { z } from "https://esm.sh/zod@3.23.8";
import { handleOptions } from "../_shared/cors.ts";
import { jsonResponse, errorResponse, escapeHtml } from "../_shared/http.ts";
import { getAdminClient, getAuthedUser, isEventStaffOrOwnerOrAdmin } from "../_shared/auth.ts";

const FN = "notify-event-reschedule";

const bodySchema = z
  .object({
    event_id: z.string().uuid(),
  })
  .strict();

function fmt(value: string | null): string {
  if (!value) return "a definir";
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function template(opts: {
  title: string;
  oldAt: string | null;
  newAt: string | null;
  venue: string;
  reason: string;
  link: string;
}) {
  // Todos os campos vindos do banco (título, local, motivo) já chegam com HTML escapado.
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border:2px solid #1b1b1b;border-radius:16px;padding:24px">
      <h1 style="margin:0 0 8px;font-size:22px">Seu evento mudou de data</h1>
      <p style="margin:0 0 16px;font-size:16px"><strong>${opts.title}</strong></p>
      <p style="margin:0 0 4px">Data anterior: <s>${fmt(opts.oldAt)}</s></p>
      <p style="margin:0 0 12px">Nova data: <strong>${fmt(opts.newAt)}</strong></p>
      <p style="margin:0 0 12px">Local: ${opts.venue}</p>
      <p style="margin:0 0 16px">Motivo informado pelo produtor: ${opts.reason}</p>
      <p style="margin:0 0 20px">Você pode manter o ingresso ou pedir reembolso integral até o início do evento.</p>
      <a href="${opts.link}" style="display:inline-block;background:#ff5c39;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px;border:2px solid #1b1b1b">Ver minhas opções</a>
      <p style="margin:24px 0 0;font-size:12px;color:#666">Entrô · ingressos@jaentro.com.br</p>
    </div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;
  if (req.method !== "POST") return errorResponse(req, FN, "E_METHOD", 405);

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return errorResponse(req, FN, "E_CONFIG", 500, "RESEND_API_KEY ausente");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://jaentro.com.br";

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
    const { event_id } = parsed.data;

    const admin = getAdminClient();

    const { allowed } = await isEventStaffOrOwnerOrAdmin(admin, user.id, event_id);
    if (!allowed) return errorResponse(req, FN, "E_FORBIDDEN", 403);

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, title, venue_name, city")
      .eq("id", event_id)
      .maybeSingle();
    if (eventError) return errorResponse(req, FN, "E_INTERNAL", 500, eventError);
    if (!event) return errorResponse(req, FN, "E_EVENT_NOT_FOUND", 404);

    // Trava de idempotência: só notifica uma vez por alteração (notified_at).
    const { data: reschedule, error: reschedError } = await admin
      .from("event_reschedules")
      .select("*")
      .eq("event_id", event_id)
      .is("notified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reschedError) return errorResponse(req, FN, "E_INTERNAL", 500, reschedError);
    if (!reschedule) return jsonResponse(req, { sent: 0, message: "Nenhuma alteração pendente de aviso" });

    // Reserva a notificação atomicamente antes de enviar, evitando envio duplicado em corrida.
    const { data: claimed, error: claimError } = await admin
      .from("event_reschedules")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", reschedule.id)
      .is("notified_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) return errorResponse(req, FN, "E_INTERNAL", 500, claimError);
    if (!claimed) return jsonResponse(req, { sent: 0, message: "Já notificado" });

    const { data: tickets, error: ticketsError } = await admin
      .from("tickets")
      .select("id, holder_email")
      .eq("event_id", event_id)
      .eq("status", "valid");
    if (ticketsError) return errorResponse(req, FN, "E_INTERNAL", 500, ticketsError);

    const recipients = new Map<string, string>();
    for (const t of (tickets ?? []) as { id: string; holder_email: string | null }[]) {
      if (t.holder_email && !recipients.has(t.holder_email)) recipients.set(t.holder_email, t.id);
    }

    const safeTitle = escapeHtml(event.title);
    const safeVenue = escapeHtml(
      [event.venue_name, event.city].filter(Boolean).join(" · ") || "a confirmar",
    );
    const safeReason = escapeHtml(reschedule.reason ?? "não informado");

    const payloads = Array.from(recipients.entries()).map(([email, ticketId]) => ({
      from: "Entrô <ingressos@jaentro.com.br>",
      to: [email],
      subject: `Seu evento mudou de data: ${event.title}`,
      html: template({
        title: safeTitle,
        oldAt: reschedule.old_starts_at,
        newAt: reschedule.new_starts_at,
        venue: safeVenue,
        reason: safeReason,
        link: `${siteUrl}/meus-ingressos/${ticketId}`,
      }),
    }));

    let sent = 0;
    for (let i = 0; i < payloads.length; i += 100) {
      const batch = payloads.slice(i, i + 100);
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      const body = await res.text();
      if (!res.ok) {
        console.error("[notify-event-reschedule] resend erro", res.status, body);
        return jsonResponse(req, { error: "Não foi possível concluir", code: "E_SEND_FAILED", sent }, 502);
      }
      sent += batch.length;
    }

    return jsonResponse(req, { sent });
  } catch (error) {
    return errorResponse(req, FN, "E_INTERNAL", 500, error);
  }
});
