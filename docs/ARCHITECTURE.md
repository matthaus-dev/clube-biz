# Arquitetura

## Visão geral

Começar como monólito modular em uma única aplicação Next.js. A interface, endpoints e casos de uso compartilham o mesmo repositório, enquanto regras de domínio permanecem isoladas de componentes React e do Prisma.

```text
Navegador do cliente ─┐
                      ├─ Next.js ─ Casos de uso ─ Prisma ─ PostgreSQL
Painel do comércio ───┘       │
                              ├─ provedor de autenticação/sessão
                              ├─ rate limit
                              └─ fila/mensageria (somente quando necessária)
```

## Estrutura sugerida

```text
src/
  app/
    (public)/
      r/[token]/
      saldo/
    (merchant)/
      painel/
    api/
  components/
  modules/
    auth/
    customers/
    loyalty/
    merchants/
    qr-codes/
    rewards/
  lib/
    db/
    security/
    observability/
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  integration/
  e2e/
```

Cada módulo deve separar, quando fizer sentido:

- `domain`: tipos, invariantes e erros;
- `application`: casos de uso e contratos;
- `infrastructure`: Prisma e serviços externos;
- `ui`: componentes e adaptadores HTTP.

## Fronteiras e responsabilidades

- Server Components para leitura e composição de páginas.
- Server Actions ou Route Handlers para comandos, sempre com validação, autorização e tratamento de erros.
- Casos de uso não devem depender de `Request`, componentes React ou detalhes de UI.
- Prisma fica atrás de repositórios ou funções de acesso específicas do módulo; não espalhar consultas pelo projeto.
- Pontos são alterados somente por um serviço transacional de movimentação.

## Rotas iniciais

```text
GET  /r/:token                    página pública do QR
POST /api/public/claims           registra crédito solicitado pelo cliente
POST /api/public/balance/challenge inicia verificação de identidade
POST /api/public/balance/verify    valida código e retorna saldo limitado

GET  /painel                      visão geral protegida
GET  /painel/clientes             clientes do estabelecimento
GET  /painel/movimentacoes        ledger filtrável
POST /api/merchant/points          lançamento manual
POST /api/merchant/redemptions     resgate de recompensa
```

Os nomes podem mudar durante a implementação, mas os limites de segurança não: endpoints públicos nunca aceitam `merchantId`, `campaignId`, pontos ou saldo como autoridade vindos do navegador.

## Transações e consistência

O ledger `PointTransaction` é a fonte de verdade. `Membership.balance` é um saldo materializado para leitura rápida e deve ser atualizado na mesma transação de banco.

Para crédito, débito, estorno ou ajuste:

1. validar campanha, identidade, permissão, limites e idempotência;
2. iniciar transação no banco;
3. obter ou criar a associação cliente-campanha;
4. criar a movimentação com chave idempotente única;
5. atualizar o saldo com operação atômica e impedir saldo negativo;
6. persistir auditoria necessária;
7. confirmar a transação;
8. disparar efeitos externos após o commit.

Requisições concorrentes com a mesma chave retornam o resultado original e não duplicam pontos.

## Multi-tenancy

- Todas as entidades de negócio devem ser alcançáveis a partir de `merchantId`.
- Toda consulta do painel recebe o estabelecimento da sessão, nunca do corpo da requisição.
- Identificadores globais não substituem o filtro de tenant.
- Índices e restrições únicas devem incluir o escopo correto do estabelecimento ou campanha.

## Configuração

Variáveis esperadas, sem valores reais no repositório:

```text
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
APP_URL=
PII_ENCRYPTION_KEY=
PII_HASH_PEPPER=
RATE_LIMIT_STORE_URL=
WHATSAPP_PROVIDER_TOKEN=   # pós-MVP
```

Fornecer `.env.example`. Validar variáveis no boot e falhar com mensagem clara quando uma variável obrigatória estiver ausente.

## Observabilidade

- logs estruturados com `requestId`, `merchantId` quando autorizado e nome do caso de uso;
- nunca registrar telefone, CPF, OTP, token de QR ou segredo completo;
- métricas de sucesso, duplicidade, bloqueio, expiração e latência;
- erros com códigos estáveis para a UI, sem revelar detalhes internos;
- trilha de auditoria para ações sensíveis do painel.

## Estratégia de testes

- unitários: regras de pontos, limites, expiração e transições de estado;
- integração com PostgreSQL real: constraints, idempotência e concorrência;
- ponta a ponta: crédito por QR, consulta de saldo, login, lançamento manual e resgate;
- testes de autorização entre dois estabelecimentos distintos;
- relógio injetável nos casos que dependem de tempo.

