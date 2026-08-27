# Instruções para agentes de desenvolvimento

Estas instruções valem para todo o repositório.

## Fonte de escopo

Antes de implementar:

1. leia `README.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, `BUSINESS-RULES.md` e `SECURITY.md`;
2. leia o arquivo da sprint solicitada;
3. inspecione o código e as mudanças existentes;
4. execute somente a sprint ou tarefa pedida, sem antecipar integrações pós-MVP.

Em conflito, preserve segurança, integridade do ledger, isolamento entre estabelecimentos e critérios de aceite. Registre decisões importantes em um ADR Markdown curto.

## Forma de trabalhar

- Faça mudanças pequenas e verificáveis.
- Não sobrescreva alterações alheias ou faça limpezas fora do escopo.
- Antes de editar, localize o padrão já usado no projeto.
- Prefira casos de uso reutilizáveis a lógica em componentes ou handlers.
- Toda entrada externa recebe validação de schema.
- Toda consulta autenticada deriva `merchantId` da sessão.
- Toda mudança de saldo passa pelo serviço transacional do ledger.
- Efeitos externos ocorrem depois do commit.
- Não adicione dependência sem justificar a necessidade e verificar manutenção/licença.

## Qualidade obrigatória

Antes de concluir uma tarefa:

- execute lint e verificação de tipos;
- execute testes afetados;
- para mudanças de banco, aplique a migração em banco vazio e teste o seed;
- para regras críticas, inclua teste de integração com PostgreSQL;
- para telas, verifique estados de carregamento, vazio, sucesso, erro e acessibilidade básica;
- atualize documentação e `.env.example` quando necessário.

Não declare uma sprint concluída se houver testes ignorados no caminho crítico, segredo real no repositório ou critério de aceite sem evidência.

## Segurança

- Nunca registre PII, OTP, sessão, token de QR ou segredo completo.
- Nunca aceite pontos, custo de recompensa, campanha ou tenant como autoridade do navegador.
- Use idempotência e transação nas operações críticas.
- Considere retries e concorrência em toda escrita.
- Retorne mensagens públicas neutras; preserve detalhes em erro interno seguro.
- Use relógio injetável para validade e expiração.

## Entrega de cada tarefa

Ao finalizar, informe:

1. resultado implementado;
2. arquivos principais alterados;
3. migrações e variáveis novas;
4. testes executados e resultado;
5. decisões, riscos ou pendências reais.

## Comandos do projeto

No bootstrap da Sprint 1, definir no `package.json` comandos equivalentes a:

```text
dev
build
lint
typecheck
test
test:integration
test:e2e
db:migrate
db:seed
```

Use o gerenciador de pacotes escolhido pelo arquivo de lock existente. Depois de escolhido, não misture gerenciadores.

