# Sprint 4 — QR Code impresso e único para delivery

## Resultado esperado

O estabelecimento gera um QR por pedido, imprime uma etiqueta e envia junto à embalagem. O código concede os pontos definidos uma única vez e depois fica inutilizável.

## Dependências

- Serviço de claim unificado das sprints anteriores.
- Painel com autenticação, papéis e auditoria.
- Definição dos tamanhos de etiqueta e impressoras prioritárias.

## Decisões antes de implementar

- [ ] Prazo de validade; padrão provisório de 30 dias.
- [ ] Pontos fixos da campanha ou editáveis por pedido e limites por papel.
- [ ] Referência de pedido obrigatória ou opcional.
- [ ] Formatos de etiqueta; começar por layout HTML de impressão e PDF somente se necessário.
- [ ] Política de reimpressão, revogação e substituição.

## Histórias

### S4.1 — Geração por pedido

- [ ] Criar formulário com referência, pontos e validade.
- [ ] Validar permissão e limites no servidor.
- [ ] Gerar token opaco; armazenar apenas hash.
- [ ] Criar `QrCode` do tipo `DELIVERY`, normalmente com `maxUses = 1`.
- [ ] Impedir códigos ativos duplicados para a mesma referência.
- [ ] Auditar criação.

Critérios de aceite:

- URL não expõe referência, pontos, PII ou ID previsível;
- pontos são validados no servidor;
- retry da geração não cria códigos duplicados;
- código nasce associado ao tenant e à campanha corretos.

### S4.2 — Claim de uso único

- [ ] Reutilizar identificação, `Membership` e ledger existentes.
- [ ] Validar status, expiração e limite de uso dentro da transação.
- [ ] Fazer transição condicional para `REDEEMED`.
- [ ] Registrar origem `DELIVERY_QR` e vínculo ao código.
- [ ] Retornar mensagem neutra para usado, expirado ou revogado.

Critérios de aceite:

- múltiplas requisições simultâneas produzem no máximo um crédito;
- falha transacional não consome o código sem creditar nem credita sem consumir;
- tentativa posterior não revela o cliente que usou;
- idempotent retry do vencedor retorna o resultado original.

### S4.3 — Impressão e gestão

- [ ] Criar tela com lista, status, referência, validade e data de uso.
- [ ] Filtrar por status, data e referência.
- [ ] Criar etiqueta com nome do estabelecimento, chamada, QR e instrução curta.
- [ ] Adicionar CSS de impressão e visualização antes de imprimir.
- [ ] Reimprimir o mesmo código ativo.
- [ ] Revogar e substituir com confirmação e auditoria.
- [ ] Garantir que analytics/logs não capturem token bruto.

Critérios de aceite:

- etiqueta permanece legível no tamanho escolhido;
- reimpressão não cria novo código;
- substituição revoga o anterior antes de liberar o novo;
- usuário sem permissão não vê nem gerencia códigos.

### S4.4 — Operação em lote opcional

Somente iniciar após o fluxo unitário estar estável.

- [ ] Gerar lote com limite de quantidade.
- [ ] Evitar referências duplicadas no arquivo e no banco.
- [ ] Produzir documento de impressão paginado.
- [ ] Relatar erros por item sem repetir itens já criados.
- [ ] Auditar lote e ator.

### S4.5 — Testes

- [ ] E2E: gerar → visualizar etiqueta → claim → status usado.
- [ ] Integração: corrida com várias conexões para um código.
- [ ] Integração: retry de criação e claim.
- [ ] Integração: expiração, revogação e substituição.
- [ ] Autorização: papéis e isolamento entre tenants.
- [ ] Visual: impressão nos tamanhos suportados.
- [ ] Segurança: URL/logs/analytics sem dados do pedido ou token persistido.

## Ordem recomendada para o Codex CLI

1. S4.1.
2. S4.2 e testes de concorrência antes da UI completa.
3. S4.3.
4. S4.5.
5. S4.4 apenas quando solicitado.

## Definição de pronto

- um pedido gera um código gerenciável e imprimível;
- no máximo um crédito é criado por código unitário;
- reimpressão, revogação e substituição têm comportamento explícito;
- token e dados do pedido não vazam;
- fluxo crítico tem teste concorrente com PostgreSQL;
- operação funciona sem integração direta com delivery.

