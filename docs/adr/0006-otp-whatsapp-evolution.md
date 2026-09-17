# ADR 0006 — OTP de saldo via Evolution API

## Decisão

Usar Evolution API v2 para enviar o OTP de consulta de saldo pelo WhatsApp da instância configurada. O adaptador usa `POST /message/sendText/{instance}`, cabeçalho `apikey` e corpo com `number` e `text`, sem dependência adicional.

Contrato conferido no [DTO oficial da Evolution API](https://github.com/EvolutionAPI/evolution-api/blob/main/src/api/dto/sendMessage.dto.ts).

Configuração: `OTP_DELIVERY_MODE=evolution`, `OTP_BASE_URL`, `OTP_API_TOKEN` e `OTP_INSTANCE`. Aceitar também `OTP_URL`, `OTP_TOKEN` e `OTP_API_TOKEn` para compatibilidade com a configuração local existente. Variáveis canônicas têm preferência. A URL deve ser a base do servidor, incluindo eventual prefixo, sem endpoint de envio. Produção exige HTTPS.

Persistir somente o hash do OTP antes do envio. Enviar fora da transação, com timeout de 10 segundos e sem retry automático para evitar envio duplicado após falha ambígua. Falha bloqueia o desafio e retorna erro neutro, sem registrar corpo ou erro do provedor. O modo console só funciona fora de produção; disabled não simula entrega bem-sucedida.

Validar que o telefone pertence ao cliente localizado antes de enviar. Corrigir a persistência de tentativas/expiração e serializar a verificação com retry transacional: um código só é consumido uma vez.

## Limites

Este incremento cobre OTP de consulta de saldo. Não adiciona mensagens de marketing, outbox, webhooks ou OTP no claim. Preserva a carteira multicampanha existente; revisão de escopo de campanha, respostas contra enumeração e rate limit compartilhado permanecem no backlog da Sprint 3. A instância deve estar conectada ao WhatsApp. Testes automatizados usam transporte simulado, sem enviar mensagens reais.
