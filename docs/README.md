# clube-biz

Sistema simples de cartão fidelidade para pequenos estabelecimentos, construído com Next.js, PostgreSQL e Prisma.

## Objetivo

Permitir que um cliente acumule pontos ao ler um QR Code do estabelecimento, consulte seu saldo e resgate recompensas. O estabelecimento acompanha clientes e movimentações em um painel, pode registrar pontos manualmente e, em etapas posteriores, usar QR Codes temporários ou exclusivos por pedido de delivery.

## Ordem de entrega

1. [Sprint 1 — Ler QR Code e registrar ponto](SPRINT-01-CORE-QR.md)
2. [Sprint 2 — Dashboard do estabelecimento](SPRINT-02-DASHBOARD.md)
3. [Sprint 3 — QR Code dinâmico](SPRINT-03-QR-DINAMICO.md)
4. [Sprint 4 — QR Code único e impresso para delivery](SPRINT-04-DELIVERY.md)
5. Pós-MVP: integração com WhatsApp e automações.

## Documentos do projeto

- [Visão do produto](PRODUCT.md)
- [Arquitetura](ARCHITECTURE.md)
- [Modelo de dados](DATA-MODEL.md)
- [Regras de negócio](BUSINESS-RULES.md)
- [Segurança e antifraude](SECURITY.md)
- [Backlog consolidado](BACKLOG.md)
- [Instruções para o Codex CLI](AGENTS.md)

## Stack inicial

- Next.js com App Router e TypeScript
- PostgreSQL
- Prisma ORM
- Validação de entrada com Zod
- Autenticação do estabelecimento por sessão segura
- Testes unitários e de integração; testes de ponta a ponta para os fluxos críticos

Bibliotecas e versões devem ser definidas no momento do bootstrap usando versões estáveis e compatíveis. Evite acoplar o domínio a bibliotecas de autenticação, QR Code, mensageria ou interface.

## Como iniciar

1. Copie estes arquivos para a raiz do repositório `clube-biz`.
2. Peça ao Codex CLI para executar a Sprint 1 seguindo `AGENTS.md` e `SPRINT-01-CORE-QR.md`.
3. Revise as decisões marcadas como `DECISÃO PENDENTE` antes de produção.
4. Só inicie a sprint seguinte quando os critérios de aceite e a definição de pronto da sprint atual estiverem atendidos.

## Escopo do MVP

O MVP termina ao final da Sprint 2. As Sprints 3 e 4 reforçam a prevenção de fraude e adicionam o fluxo de delivery. WhatsApp é pós-MVP e não deve bloquear o fluxo principal.

