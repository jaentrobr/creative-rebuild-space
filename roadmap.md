# Roadmap — Entrô (Supabase próprio)

Regras: proibido Lovable Cloud; banco criado manualmente via SQL (não criar migrações);
service_role nunca no front; papéis sempre de `user_roles`; checkout pago fica para depois (Asaas).

## Concluído
- [x] Banco do usuário verificado (23 tabelas + RPCs) e tipos gerados do schema real
- [x] Autenticação, site público, produtor, comprador, portaria e admin ligados ao Supabase real
- [x] v2 alteração de data (produtor, comprador, admin, notificações)
- [x] v3 remoção de telefone do comprador + contato do produtor
- [x] Banner desktop, aviso de cookies e tipografia do rodapé

## Revisão v4 (em andamento)
- [x] Base compartilhada: `src/config/security.ts`, `src/lib/safe-url.ts`,
      `src/lib/friendly-error.ts`, `src/lib/uploads.ts`, `src/components/captcha.tsx`
- [x] robots.txt bloqueando áreas privadas
- [x] `vercel.json` com CSP, HSTS e demais cabeçalhos de segurança
- [x] Imagens só do Storage (safeImageSrc) e links de markdown sanitizados
- [ ] Telas de acesso: captcha, zod, redirect seguro, mensagens neutras (agente)
- [ ] Admin: MFA TOTP aal2, logout por inatividade, /admin/diagnostico (agente)
- [ ] Produtor: zod, uploads, clique duplo, tratamento de erros (agente)
- [ ] Comprador + portaria: clique duplo, erros, limpeza de sessão/IndexedDB (agente)
- [ ] Edge Functions: auth, zod, CORS, escapes, limites de abuso, health-check (agente)
- [ ] Fechamento: meta noindex nas áreas privadas, remoção de código morto, typecheck/lint/build

## Depende do usuário
- [ ] Deploy manual das Edge Functions no Supabase dele (secrets RESEND_API_KEY e SITE_URL)
- [ ] Checkout pago via Asaas — fora de escopo por decisão do projeto
