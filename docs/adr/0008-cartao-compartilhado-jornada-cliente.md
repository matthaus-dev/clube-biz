# ADR 0008 — Cartão compartilhado na jornada pública

Status: aceito. Data: 24/09/2026.

## Decisão

Usar o mesmo componente de cartão na confirmação do QR e na carteira verificada. Exibir saldo real, meta, selos e recompensa. Substituir o formulário após crédito confirmado; não conceder acesso à carteira por esse sucesso. Manter OTP para consulta de todos os cartões e histórico associado a cada cartão.

## Consequências

Reduz repetição visual e cliques para descobrir o saldo. Não altera APIs de crédito, ledger ou autorização. Não animar novos selos enquanto a API não diferencia replay idempotente de um novo crédito. Preservar cores, tipografia e assinatura de bilhete; eliminar inclinação para leitura em telas pequenas.
