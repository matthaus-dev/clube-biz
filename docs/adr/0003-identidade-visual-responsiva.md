# ADR 0003 — Identidade visual responsiva

## Status

Aceita em 26 de agosto de 2026.

## Contexto

A interface das Sprints 1 e 2 precisava se diferenciar do padrão verde usado em outro produto, melhorar a hierarquia das informações e funcionar com a mesma clareza no computador e no celular.

## Decisão

A identidade do `clube-biz` usa azul-noturno na navegação, cobalto como cor primária e coral como destaque. Superfícies branco-azuladas, cantos moderados, sombras discretas e ícones lineares formam o sistema visual. Títulos usam uma família humanista arredondada, o corpo usa uma sans de interface e números operacionais usam uma monoespaçada curta.

O cartão fidelidade perfurado e seus carimbos são o elemento de assinatura da experiência pública. No computador, o painel usa navegação lateral fixa e uma área de conteúdo ampla. Em telas de até 760 px, a marca e a sessão ficam no topo e a navegação principal ocupa uma barra inferior fixa, ao alcance do polegar. Filtros ocupam toda a largura, formulários passam para uma coluna e tabelas essenciais viram cartões rotulados, evitando leitura horizontal.

Estados de foco visíveis, alvos de toque com pelo menos 44 px e suporte a preferência por movimento reduzido são requisitos do sistema.

## Consequências

- A experiência pública e o painel compartilham tokens e componentes visuais.
- Novas telas devem reutilizar as variáveis e classes de `src/app/globals.css`.
- Verde fica reservado a mensagens de sucesso, não à identidade principal.
- A imagem `public/og.png` representa a marca em compartilhamentos sociais.
