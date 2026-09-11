# Roadmap — Entrô (Supabase próprio)

Regras: proibido Lovable Cloud; banco criado manualmente via SQL (não criar migrações);
service_role nunca no front; papéis sempre de `user_roles`; checkout pago fica para depois (Asaas).

## Bloqueado
- [ ] **Banco vazio** — o projeto Supabase `efkdhroootmfleltepye` não tem nenhuma tabela
      (`public` só expõe a RPC `rls_auto_enable`). Aguardando o usuário rodar o SQL do schema
      ou confirmar o projeto correto.

## Etapas (após o banco existir)
- [ ] Gerar tipos TypeScript a partir do schema real
- [ ] 1. Remover dados falsos de `src/data/` e todas as simulações (manter `src/config/empresa.ts`, `src/content/termos-produtor.md`); estados vazios da marca
- [ ] 2. Autenticação real (AuthProvider, /cadastro 4 etapas, /entrar, recuperação, proteção de rotas)
- [ ] 3. Site público com dados reais (home, /eventos, /evento/$slug, banners, termos)
- [ ] 4. Painel do produtor real (eventos, ingressos/lotes, verificação, cupons, divulgadores, participantes, equipe, cortesias, financeiro desabilitado)
- [ ] 5. Área do comprador real (ingressos, pedidos, minha conta)
- [ ] 6. Portaria real (login staff, offline IndexedDB, fila de sincronização)
- [ ] 7. Admin real (leituras reais, ações com audit_logs, papéis por menu)
- [ ] 8. Edge Functions `create-staff-user` e `issue-tickets` (deploy manual no Supabase do usuário; secrets RESEND_API_KEY e SITE_URL)
