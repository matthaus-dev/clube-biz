# Sprint 2 — Dashboard do estabelecimento

## Resultado esperado

O estabelecimento entra em um painel isolado, acompanha a campanha, encontra clientes, registra pontos manualmente e confirma/cancela resgates com auditoria.

## Dependências

- Sprint 1 concluída e estável.
- Serviço transacional de pontos reutilizável.
- Decisão de provedor/estratégia de autenticação.

## Histórias

### S2.1 — Autenticação e autorização

- [ ] Implementar login, logout, expiração e revogação de sessão.
- [ ] Implementar `OWNER`, `MANAGER` e `ATTENDANT`.
- [ ] Derivar tenant e ator somente da sessão.
- [ ] Proteger todas as rotas e comandos do painel.
- [ ] Auditar login e falhas relevantes sem registrar credenciais.
- [ ] Criar matriz de permissão testável.

Critérios de aceite:

- usuário desativado perde acesso;
- usuário de um tenant não lê nem altera outro tenant;
- chamada direta ao endpoint respeita a mesma autorização da UI.

### S2.2 — Visão geral

- [ ] Mostrar clientes ativos, créditos, resgates e pontos emitidos no período.
- [ ] Permitir seleção de período com timezone do estabelecimento.
- [ ] Mostrar atividade recente e alertas operacionais.
- [ ] Criar estados vazio, carregando e erro.

Critérios de aceite:

- métricas reconciliam com o ledger;
- paginação/agregações não carregam tabelas inteiras em memória;
- datas respeitam timezone configurado.

### S2.3 — Clientes e histórico

- [ ] Listar clientes com paginação por cursor.
- [ ] Buscar por telefone/CPF exato usando hashes.
- [ ] Mascarar identificadores por padrão.
- [ ] Exibir saldo, totais e movimentações do cliente.
- [ ] Filtrar ledger por data, tipo, origem e ator.

Critérios de aceite:

- busca não vaza dados de outro estabelecimento;
- listas continuam utilizáveis com volume alto;
- ledger é somente leitura e preserva reversões.

### S2.4 — Registro manual

- [ ] Criar formulário de localização/criação de cliente.
- [ ] Implementar caso de uso manual reutilizando o ledger.
- [ ] Exigir motivo e idempotency key.
- [ ] Aplicar limites por papel.
- [ ] Permitir reversão autorizada, sem editar evento original.
- [ ] Criar auditoria e feedback de sucesso/erro.

Critérios de aceite:

- duplo envio não duplica pontos;
- usuário sem permissão não contorna limite por API;
- motivo, ator e origem aparecem no histórico;
- reversão mantém saldo não negativo e trilha completa.

### S2.5 — Recompensas e resgate

- [ ] Criar gestão básica de recompensa ativa.
- [ ] Localizar cliente e mostrar elegibilidade.
- [ ] Implementar confirmação de resgate com resumo.
- [ ] Criar `Redemption` e débito na mesma transação.
- [ ] Implementar cancelamento com movimentação compensatória.
- [ ] Aplicar idempotência, autorização e auditoria.

Critérios de aceite:

- saldo insuficiente impede o resgate;
- concorrência não permite gastar os mesmos pontos duas vezes;
- custo vem da recompensa persistida;
- cancelamento restaura pontos uma única vez.

### S2.6 — Configuração básica da campanha

- [ ] Editar nome público, crédito padrão, recompensa, janela e limite diário.
- [ ] Pausar/reativar campanha com confirmação.
- [ ] Validar valores e preservar regras históricas.
- [ ] Auditar mudanças.

Critérios de aceite:

- alteração afeta somente operações futuras;
- não é possível ativar duas campanhas no MVP;
- pausa bloqueia novos créditos públicos e manuais conforme regra definida.

### S2.7 — Testes

- [ ] E2E: login → dashboard → cliente → lançamento manual.
- [ ] E2E: saldo suficiente → resgate → cancelamento.
- [ ] Integração: concorrência no resgate.
- [ ] Integração: idempotência do lançamento manual.
- [ ] Autorização: matriz de papéis.
- [ ] Isolamento: dois tenants em todas as consultas/comandos críticos.
- [ ] Acessibilidade básica nas telas e diálogos.

## Ordem recomendada para o Codex CLI

1. S2.1.
2. S2.2 e S2.3.
3. S2.4.
4. S2.5 e S2.6.
5. S2.7, documentação e revisão de autorização.

## Definição de pronto

- painel protegido e isolado por tenant;
- crédito manual e resgate usam o ledger central;
- operações sensíveis são idempotentes e auditadas;
- métricas reconciliam com dados persistidos;
- testes críticos e de autorização passam;
- o MVP funciona sem integração WhatsApp.

