# Roadmap — Entrô (Supabase próprio)

Regras: proibido Lovable Cloud; banco criado manualmente via SQL (não criar migrações);
service_role nunca no front; papéis sempre de `user_roles`; checkout pago fica para depois (Asaas).

## Concluído
- [x] Banco do usuário verificado (23 tabelas + RPCs)
- [x] Tipos TypeScript gerados do schema real (`src/integrations/meu-supabase/types.ts`)
- [x] Cliente tipado (`src/integrations/meu-supabase/client.ts`), `AuthProvider` (`src/lib/auth.tsx`),
      `RequireAuth` e helpers públicos (`src/lib/queries.ts`)

## Em andamento (agentes)
- [ ] 1. Autenticação real + minha conta + header
- [ ] 2. Site público com dados reais (home, /eventos, /evento/$slug, banners)
- [ ] 3. Painel do produtor real
- [ ] 4. Área do comprador + portaria real
- [ ] 5. Admin real

## Pendente
- [ ] 6. Edge Functions `create-staff-user` e `issue-tickets` (deploy manual no Supabase do usuário;
      secrets RESEND_API_KEY e SITE_URL) — bloqueado: exige deploy pelo usuário
- [ ] 7. Checkout pago via Asaas — fora de escopo por decisão do projeto

- [x] Corrigir todos os erros de typecheck/build

- [ ] v2 alteração de data: corrigir todos os erros de typecheck/build ao final
