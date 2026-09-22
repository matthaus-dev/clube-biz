# ADR 0007 — Boas-vindas transacional pelo WhatsApp

## Status

Aceito.

## Contexto

O cadastro público pelo QR precisa reduzir ambiguidade na identificação e orientar o novo cliente sobre a carteira multicampanha. O envio externo não pode fazer parte da transação crítica de pontos nem gerar mensagens repetidas em retries ou concorrência.

## Decisão

- Os fluxos públicos de QR e consulta de cartões usam somente telefone; CPF continua disponível em operações administrativas e dados legados.
- Cliente global novo informa telefone e nome obrigatórios, sobrenome opcional e concede consentimento explícito para a mensagem transacional.
- Consentimento e uma entrega `WELCOME_WHATSAPP` são persistidos na mesma transação que cria o primeiro cliente/cartão.
- A entrega é única por cliente e tipo. Não há cooldown temporal.
- O Route Handler agenda o envio com `after()` somente após o commit e reutiliza o transporte Evolution já empregado pelo OTP.
- Antes da chamada externa, a entrega muda atomicamente de `PENDING` para `PROCESSING`. Sucesso vira `SENT`; falha vira `FAILED`.
- Não há retry automático, pois timeout pode significar que o provedor recebeu a mensagem e uma nova tentativa poderia duplicá-la.
- Falhas de WhatsApp nunca revertem cadastro, membership, claim ou ledger.

## Consequências

- Cliente existente que ingressa em outro estabelecimento não refaz cadastro nem recebe nova boas-vindas.
- A mensagem aponta para `${APP_URL}/saldo`, onde o telefone é verificado por OTP antes de mostrar cartões.
- Entregas falhas ficam registradas sem telefone, conteúdo ou resposta do provedor em claro.
