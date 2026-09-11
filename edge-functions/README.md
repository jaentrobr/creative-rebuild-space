# Edge Functions — Entrô

Deploy sempre MANUAL, pelo Supabase externo do usuário. Copie a pasta da função e a pasta
`_shared/` para `supabase/functions/` no ambiente local antes de rodar o deploy.

## Funções

### notify-event-reschedule
Avisa por e-mail os titulares de ingresso válidos quando um evento é remarcado (uma única vez por
alteração, via `notified_at`).
- Secrets: `RESEND_API_KEY`, `SITE_URL`
- Deploy: `supabase functions deploy notify-event-reschedule`

### send-test-email
Envia um e-mail de teste para o próprio owner. Limite: 5 por hora por admin.
- Secrets: `RESEND_API_KEY`
- Deploy: `supabase functions deploy send-test-email`

### issue-tickets
Emite ingressos gratuitos (lotes com preço 0) para o usuário autenticado, respeitando o limite
`max_per_order` somado a todos os pedidos anteriores do mesmo usuário no mesmo evento.
- Secrets: nenhum específico (usa `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` padrão)
- Deploy: `supabase functions deploy issue-tickets`

### create-staff-user
Cria um usuário de portaria (`event_staff`) vinculado a um evento. Somente o dono do produtor ou
um admin da plataforma pode chamar. Limite de 20 porteiros por evento.
- Secrets: nenhum específico
- Deploy: `supabase functions deploy create-staff-user`

### health-check
Somente para o papel `owner` autenticado com MFA (`aal2`). Retorna apenas booleanos (nunca valores)
sobre: conexão com o banco, presença dos secrets `RESEND_API_KEY`/`SITE_URL`, existência dos buckets
`event-banners`, `producer-logos`, `home-banners`, `verification-docs`, e se as demais funções
respondem (chamada sem efeito colateral).
- Secrets: os mesmos citados acima, apenas para checar presença
- Deploy: `supabase functions deploy health-check`

## Secrets a configurar no projeto Supabase
- `RESEND_API_KEY`
- `SITE_URL`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (padrão do projeto Supabase)

## SQL sugerido (não aplicado — banco é externo e gerenciado pelo usuário)
Nenhuma migração de schema foi necessária: todas as tabelas usadas (`orders`, `tickets`, `lots`,
`event_staff`, `producers`, `event_reschedules`, `platform_settings`, `audit_logs`, `user_roles`)
já existem. Caso quiera um contador dedicado para rate limit do `send-test-email` em vez de reusar
`audit_logs`, sugestão opcional:

```sql
create table if not exists public.email_rate_limits (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists email_rate_limits_actor_kind_idx
  on public.email_rate_limits (actor_id, kind, created_at);
```
