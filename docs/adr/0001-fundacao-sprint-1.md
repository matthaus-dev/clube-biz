# ADR 0001 — Fundação da Sprint 1

## Status

Aceito para o piloto; revisar antes de produção.

## Contexto

A Sprint 1 precisa entregar crédito por QR fixo e consulta protegida de saldo, mas ainda não há provedor externo de mensagens nem infraestrutura compartilhada de rate limit no ambiente local.

## Decisão

- Usar janela padrão de 12 horas e limite de 2 créditos por dia, configuráveis por campanha.
- Usar PostgreSQL como único banco suportado e transações `Serializable` com até três tentativas para conflitos concorrentes.
- Manter o ledger como fonte de verdade e atualizar o saldo materializado na mesma transação.
- Cifrar telefone/CPF com AES-256-GCM e criar hashes de busca com HMAC-SHA-256 e pepper externo ao banco.
- Armazenar apenas SHA-256 do token opaco do QR.
- Devolver OTP na resposta somente em desenvolvimento com `OTP_DELIVERY_MODE=console`; produção nunca devolve o código.
- Usar rate limit em memória apenas no desenvolvimento. Produção exige armazenamento compartilhado antes da publicação.
- Fixar Prisma 6.12 por não apresentar os avisos de segurança encontrados na linha 6.19 no momento do bootstrap.

## Consequências

- O fluxo pode ser desenvolvido sem contratar SMS imediatamente.
- O processo local precisa de PostgreSQL para migração, seed e testes de integração.
- Rate limit local não protege implantação com múltiplas instâncias.
- Um provedor real de OTP poderá substituir o adaptador sem alterar o caso de uso de saldo.
