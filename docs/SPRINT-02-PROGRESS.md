# Progresso da Sprint 2

Atualizado em 22 de setembro de 2026.

## S2.1 — Autenticação e autorização

- [x] Login e senha Argon2id.
- [x] Sessão opaca persistida, expiração, logout e revogação.
- [x] Papéis `OWNER`, `MANAGER` e `ATTENDANT`.
- [x] Matriz de permissões testada.
- [x] Tenant e ator derivados exclusivamente da sessão.
- [x] Usuário desativado perde acesso imediatamente.
- [x] Auditoria de login com resposta neutra.

## S2.2 — Visão geral

- [x] Clientes ativos, créditos, resgates e pontos emitidos.
- [x] Períodos de 7, 30 e 90 dias.
- [x] Datas e início do período no timezone do estabelecimento.
- [x] Atividade recente e alerta de campanha pausada.
- [x] Estados vazios e layout responsivo.

## S2.3 — Clientes e histórico

- [x] Lista paginada por cursor.
- [x] Busca exata por telefone ou CPF usando hash.
- [x] Identificadores mascarados.
- [x] Detalhe com saldo, totais e ledger.
- [x] Movimentações filtráveis por data, tipo e origem.
- [x] Isolamento entre dois tenants testado.

## S2.4 — Registro manual

- [x] Localização ou criação de cliente.
- [x] Crédito pelo ledger central.
- [x] Motivo, ator, idempotência e auditoria.
- [x] Limites por papel.
- [x] Estorno por movimentação compensatória.

## S2.5 — Recompensas e resgate

- [x] Recompensa ativa configurável.
- [x] Localização do cliente e exibição de saldo.
- [x] Resgate e débito na mesma transação.
- [x] Cancelamento com compensação.
- [x] Concorrência impede gasto duplo.
- [x] Custo carregado do banco e tenant validado no servidor.

## S2.6 — Configuração

- [x] Nome, pontos, meta, recompensa, intervalo e limite diário.
- [x] Pausa e reativação da campanha.
- [x] Alterações afetam somente operações futuras.
- [x] Restrição de uma campanha ativa por estabelecimento.
- [x] Auditoria de alterações.

## S2.7 — Qualidade

- [x] Testes unitários da matriz de permissões.
- [x] Testes de integração de idempotência, limites, tenant e resgate concorrente.
- [x] E2E de login, dashboard, cliente e crédito manual.
- [x] E2E de resgate e cancelamento.
- [x] E2E de logout e usuário desativado.
- [x] Lint, tipos, build e auditoria de dependências.

## Situação

Sprint 2 concluída. O MVP funciona sem WhatsApp. Controles adicionais de produção, como MFA e rate limit compartilhado, continuam registrados em `SECURITY.md`.

O login remoto foi validado em produção após a correção das variáveis `PII_ENCRYPTION_KEY` e `PII_HASH_PEPPER` na Vercel. A correção foi operacional; não houve mudança necessária na regra de autenticação.
