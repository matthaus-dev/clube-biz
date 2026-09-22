# Pós-MVP — Integração WhatsApp

## Objetivo

Adicionar comunicação e verificação pelo WhatsApp sem tornar o provedor parte crítica da transação de pontos.

## Casos de uso

- enviar OTP para consulta de saldo ou validação de identidade;
- confirmar crédito e informar saldo;
- avisar que uma recompensa está disponível;
- confirmar resgate;
- permitir opt-out e mensagens estritamente transacionais.

## Incremento implementado — boas-vindas

- cadastro público somente por telefone, nome obrigatório e sobrenome opcional;
- consentimento explícito com finalidade e origem persistidas;
- uma única boas-vindas por cliente global, com link para `/saldo`;
- entrega agendada após o commit com registro `PENDING | PROCESSING | SENT | FAILED`;
- sem cooldown e sem retry automático, priorizando a prevenção de duplicidade após falha ambígua.

## Arquitetura

```text
Caso de uso de pontos
  → commit no PostgreSQL
  → grava OutboxEvent na mesma transação
  → worker lê outbox
  → adaptador do provedor envia mensagem
  → registra resultado e agenda retry se necessário
```

O envio nunca acontece antes do commit e a falha do WhatsApp nunca desfaz uma movimentação válida.

## Tarefas

- [ ] Criar contrato `MessagingProvider` independente de fornecedor.
- [ ] Modelar consentimento, finalidade, origem e opt-out.
- [ ] Implementar outbox transacional.
- [ ] Implementar worker com retry exponencial, limite e dead-letter.
- [ ] Usar chave idempotente por evento/template/destino.
- [ ] Criar templates aprovados e versionados.
- [ ] Processar webhooks com assinatura e proteção contra replay.
- [ ] Aplicar retenção mínima a payloads e respostas do provedor.
- [ ] Criar painel de falhas sem expor telefone completo.
- [ ] Testar indisponibilidade, duplicidade e entrega fora de ordem.

## Critérios de aceite

- pontos são registrados mesmo com provedor indisponível;
- retry não envia confirmação duplicada;
- usuário sem consentimento não recebe marketing;
- opt-out é respeitado;
- webhooks inválidos ou repetidos são rejeitados/idempotentes;
- logs e painel mascaram destino e conteúdo sensível.
