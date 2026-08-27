# Progresso da Sprint 1

Atualizado em 26 de agosto de 2026.

## Concluído

- [x] Bootstrap Next.js com App Router e TypeScript.
- [x] PostgreSQL + Prisma configurados e Prisma Client gerado.
- [x] Schema inicial completo, migração SQL e constraints de domínio.
- [x] `.env.example`, validação de ambiente e scripts do projeto.
- [x] Normalização, validação, cifragem e hash de telefone/CPF.
- [x] Hash de token de QR e seed repetível preparado.
- [x] Página pública `/r/[token]` mobile first.
- [x] Caso de uso de crédito com ledger, saldo atômico e idempotência.
- [x] Janela de 12 horas, limite diário de 2 e timezone do estabelecimento.
- [x] Retry de transação serializável em conflito concorrente.
- [x] Consulta de saldo por desafio OTP com limite de tentativas.
- [x] Rate limit local por contexto e respostas públicas neutras.
- [x] Testes unitários de identidade, criptografia, política de claim e rate limit.
- [x] Lint, tipos, testes unitários e build de produção.

## Pendente por ambiente

- [x] Disponibilizar uma instância PostgreSQL local/de teste.
- [x] Aplicar a migração em banco vazio.
- [x] Corrigir `PII_ENCRYPTION_KEY`, executar o seed e validar repetição.
- [x] Adicionar/executar testes de integração de idempotência e concorrência contra PostgreSQL.
- [x] Executar teste E2E do fluxo completo com banco e Chromium.

## Pendente antes de produção

- [ ] Substituir o OTP local por provedor real.
- [ ] Substituir rate limit em memória por armazenamento compartilhado.
- [ ] Configurar corretamente a origem confiável do IP no proxy de implantação.
- [ ] Decidir se OTP será obrigatório no crédito inicial ou somente por risco/primeiro uso.
- [ ] Revisar LGPD, retenção e política de privacidade.

## Situação

Sprint 1 concluída para desenvolvimento e piloto local. Os itens restantes são controles de produção e não bloqueiam o início da Sprint 2.

## Como retomar

1. Configurar `.env` com banco e segredos locais.
2. Executar `npm run db:migrate` e `npm run db:seed`.
3. Abrir a URL de QR informada pelo seed.
4. Implementar e executar os testes de integração e E2E restantes.
