# ADR 0002 — Autenticação, autorização e ledger da Sprint 2

## Status

Aceito.

## Contexto

O painel precisa de logout revogável, bloqueio imediato de usuários, isolamento entre estabelecimentos e operações de saldo seguras sob retry e concorrência.

## Decisão

- Usar senha Argon2id e sessão opaca persistida no PostgreSQL.
- Guardar no cookie apenas token aleatório; persistir somente seu hash SHA-256.
- Expirar sessões em oito horas, permitir revogação e rejeitar a sessão sempre que usuário ou estabelecimento não estiver ativo.
- Derivar usuário, papel e `merchantId` exclusivamente da sessão.
- Validar autorização em cada caso de uso, além da interface.
- Permitir `ATTENDANT` creditar somente o padrão da campanha; `MANAGER` até 50 pontos; `OWNER` até o limite técnico validado pelo endpoint.
- Centralizar QR, crédito manual, resgate, cancelamento e estorno em `postPointTransaction`.
- Executar escritas críticas em isolamento `Serializable`, com retry limitado para conflito ou unicidade concorrente.
- Preservar eventos originais; correções e cancelamentos criam movimentações compensatórias.
- Registrar login, crédito, estorno, resgate, cancelamento e configuração em `AuditLog` sem PII em claro.

## Consequências

- Logout e desativação passam a ter efeito imediato.
- Consultas e comandos não aceitam tenant como autoridade do navegador.
- O banco tem uma leitura adicional por requisição autenticada, compensada pela simplicidade e revogação imediata.
- MFA, rate limit compartilhado e gestão de usuários permanecem controles de produção/futuro.
