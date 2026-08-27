# Backlog consolidado

## Legenda

- `P0`: necessário para a sprint entregar valor com segurança.
- `P1`: importante, pode vir logo após o caminho principal.
- `P2`: melhoria ou pós-MVP.
- Cada item deve resultar em código, teste, documentação ou decisão verificável.

## Fundação

- [ ] `P0` Inicializar Next.js com App Router, TypeScript e lint/format.
- [ ] `P0` Configurar PostgreSQL, Prisma, migrações e seed.
- [ ] `P0` Criar validação central de ambiente e `.env.example`.
- [ ] `P0` Definir padrão de erros, logs estruturados e `requestId`.
- [ ] `P0` Preparar suíte de testes com banco PostgreSQL isolado.
- [ ] `P1` CI para lint, tipos, testes e verificação de migração.
- [ ] `P1` Documentar execução local e decisões arquiteturais relevantes.

## Sprint 1 — Core de fidelidade

- [ ] `P0` Modelar estabelecimento, cliente, campanha, associação, ledger, QR e claim.
- [ ] `P0` Criar seed de demonstração e QR fixo.
- [ ] `P0` Implementar página pública `/r/[token]`.
- [ ] `P0` Normalizar e proteger telefone/CPF.
- [ ] `P0` Criar/identificar cliente sem duplicidade silenciosa.
- [ ] `P0` Registrar ponto com transação, idempotência e saldo atômico.
- [ ] `P0` Aplicar janela de repetição, limite diário e rate limit.
- [ ] `P0` Exibir confirmação e saldo mascarado.
- [ ] `P0` Implementar consulta de saldo com desafio de verificação.
- [ ] `P0` Testar concorrência, duplicidade e isolamento entre campanhas.
- [ ] `P1` Tela acessível de erro, expiração e campanha pausada.
- [ ] `P1` Métricas básicas de conversão e bloqueio.

## Sprint 2 — Dashboard

- [ ] `P0` Autenticação, sessão e papéis do estabelecimento.
- [ ] `P0` Dashboard com métricas principais.
- [ ] `P0` Lista e detalhe de clientes com paginação.
- [ ] `P0` Histórico de movimentações filtrável.
- [ ] `P0` Registro manual com motivo, permissão e idempotência.
- [ ] `P0` Cadastro de recompensa e resgate transacional.
- [ ] `P0` Cancelamento de resgate por compensação.
- [ ] `P0` Configuração básica da campanha.
- [ ] `P0` Auditoria de ações sensíveis.
- [ ] `P0` Testes de autorização cruzada entre tenants.
- [ ] `P1` Exportação CSV com permissão e proteção de dados.
- [ ] `P1` Busca exata por telefone/CPF e estados vazios.

## Sprint 3 — QR dinâmico

- [ ] `P0` Gerar token temporário no servidor.
- [ ] `P0` Tela autenticada que rotaciona o QR.
- [ ] `P0` Validar início, expiração, revogação e campanha.
- [ ] `P0` Reutilizar o caso de uso de crédito sem duplicar regra.
- [ ] `P0` Impedir bypass de limites usando tokens sucessivos.
- [ ] `P0` Auditar geração e revogação.
- [ ] `P0` Testar expiração e corrida na fronteira de tempo.
- [ ] `P1` Fallback operacional quando a tela perde conexão.
- [ ] `P1` Indicadores de tokens emitidos, expirados e usados.

## Sprint 4 — Delivery

- [ ] `P0` Gerar QR único por pedido com expiração e pontos.
- [ ] `P0` Garantir uso único atomicamente.
- [ ] `P0` Listar, filtrar, revogar, reimprimir e substituir códigos.
- [ ] `P0` Criar etiqueta imprimível em formato configurado.
- [ ] `P0` Não expor dados do pedido na URL.
- [ ] `P0` Tratar código já usado sem vazar identidade.
- [ ] `P0` Testar corrida com múltiplos resgates simultâneos.
- [ ] `P1` Geração em lote com limites e auditoria.
- [ ] `P1` Importação de referências de pedido.
- [ ] `P2` API/webhook para plataformas de delivery.

## Pós-MVP

- [ ] `P2` Abstração de provedor de mensagens.
- [ ] `P2` WhatsApp para OTP e confirmação assíncrona.
- [ ] `P2` Consentimento, opt-out, templates e retenção.
- [ ] `P2` Jobs com retry, backoff, idempotência e dead-letter.
- [ ] `P2` Segmentação e campanhas avançadas.
- [ ] `P2` Múltiplas campanhas ativas com regras explícitas.
- [ ] `P2` Webhooks de eventos e integrações de PDV.

## Dívida técnica que não deve ser criada

- alterar saldo diretamente sem ledger;
- confiar em `merchantId`, pontos ou custo enviados pelo cliente;
- salvar CPF, telefone, OTP ou token em texto puro;
- usar CPF como senha;
- implementar rate limit somente em memória para produção;
- editar/apagar movimentações para corrigir saldo;
- misturar envio de WhatsApp na transação de crédito;
- copiar regras de pontuação entre QR fixo, dinâmico, delivery e painel.

