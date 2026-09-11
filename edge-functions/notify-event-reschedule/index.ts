// Edge Function: notify-event-reschedule
// Deploy MANUAL no seu Supabase (copie esta pasta para supabase/functions/ no seu ambiente local):
//   supabase functions deploy notify-event-reschedule
// Secrets necessários: RESEND_API_KEY, SITE_URL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY não configurado" }, 500);
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://jaentro.com.br";

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { event_id } = await req.json();
    if (!event_id) return json({ error: "event_id obrigatório" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, title, venue_name, city, producer_id, producers(owner_user_id)")
      .eq("id", event_id)
      .maybeSingle();
    if (eventError) return json({ error: eventError.message }, 500);
    if (!event) return json({ error: "Evento não encontrado" }, 404);

    const ownerId = (event as { producers?: { owner_user_id?: string } | null }).producers
      ?.owner_user_id;
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (ownerId !== user.id && !isAdmin) return json({ error: "Sem permissão" }, 403);

    const { data: reschedule } = await admin
      .from("event_reschedules")
      .select("*")
      .eq("event_id", event_id)
      .is("notified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!reschedule) return json({ sent: 0, message: "Nenhuma alteração pendente de aviso" });

    const { data: tickets } = await admin
      .from("tickets")
      .select("id, holder_email")
      .eq("event_id", event_id)
      .eq("status", "valid");

    const recipients = new Map<string, string>();
    for (const t of (tickets ?? []) as { id: string; holder_email: string | null }[]) {
      if (t.holder_email && !recipients.has(t.holder_email)) recipients.set(t.holder_email, t.id);
    }

    const payloads = Array.from(recipients.entries()).map(([email, ticketId]) => ({
      from: "Entrô <ingressos@jaentro.com.br>",
      to: [email],
      subject: `Seu evento mudou de data: ${event.title}`,
      html: template({
        title: event.title as string,
        oldAt: reschedule.old_starts_at,
        newAt: reschedule.new_starts_at,
        venue: [event.venue_name, event.city].filter(Boolean).join(" · ") || "a confirmar",
        reason: reschedule.reason ?? "não informado",
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
        console.error("[resend] erro", res.status, body);
        return json({ error: `Resend ${res.status}: ${body}`, sent }, 502);
      }
      sent += batch.length;
    }

    await admin
      .from("event_reschedules")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", reschedule.id);
    return json({ sent });
  } catch (error) {
    console.error("[notify-event-reschedule]", error);
    return json({ error: String(error) }, 500);
  }
});
