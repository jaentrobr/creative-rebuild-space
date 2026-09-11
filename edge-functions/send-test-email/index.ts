// Edge Function: send-test-email (somente owner)
// Deploy MANUAL: copie para supabase/functions/send-test-email no seu ambiente e rode
//   supabase functions deploy send-test-email
// Secrets: RESEND_API_KEY
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY não configurado" }, 500);

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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isOwner = ((roles ?? []) as { role: string }[]).some((r) => r.role === "owner");
    if (!isOwner) return json({ error: "Somente o owner pode enviar e-mail de teste" }, 403);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Entrô <ingressos@jaentro.com.br>",
        to: [user.email],
        subject: "Teste de e-mail da Entrô",
        html: "<p>Se você recebeu esta mensagem, o envio de e-mails da Entrô está funcionando.</p>",
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[resend] erro", res.status, body);
      return json({ error: `Resend ${res.status}: ${body}` }, 502);
    }
    return json({ ok: true, to: user.email, resend: JSON.parse(body) });
  } catch (error) {
    console.error("[send-test-email]", error);
    return json({ error: String(error) }, 500);
  }
});
