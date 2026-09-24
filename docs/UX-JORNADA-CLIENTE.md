# Jornada do cliente — QR, confirmação e carteira

## Levantamento e escopo — 24/09/2026

O cliente registra pontos pelo QR; o resgate da recompensa continua sendo feito pela equipe da loja. Esta entrega altera apresentação, não regras de crédito.

| Problema observado | Alteração | Aceite |
| --- | --- | --- |
| Formulário permanece após crédito | Confirmação substitui formulário e apresenta cartão aberto | Saldo vem da resposta do servidor; não há novo botão de crédito |
| Cartão limitado a dez círculos | Componente compartilhado com meta real | Metas de 2, 4, 6, 8, 10 e 12 mostram todos os selos |
| Percentuais escondem quanto falta | Saldo/meta e pontos restantes, selos sempre visíveis | Saldo acima da meta não é zerado nem reduzido por módulo |
| Textos de identificação permanecem na carteira | Cabeçalho específico para identificação, código e cartões | Carteira só aparece após verificação bem-sucedida |
| Histórico global pertence ao primeiro cartão | Histórico dentro de cada cartão | Sem mistura de estabelecimentos |
| Telefone digitado sem referência na confirmação do código | Destino mascarado, opção de corrigir número e pedir novo código | Sem telefone em URL ou armazenamento persistente |

## Direção visual (frontend-design)

Preservar canvas #f3f6fb, papel #ffffff, tinta #17233d, azul #3e5bed, coral #ff735d e linha #dce3ef. Manter Trebuchet para títulos, Aptos/Segoe UI para corpo e Consolas para dados. O cartão físico de selos é a assinatura: azul-marinho, selos coral, sombra azul discreta, sem inclinação. Títulos curtos deixam espaço ao progresso. Uma única apresentação reutilizada evita diferenças entre confirmação e carteira.

Fluxo: QR → identificação → cadastro se necessário → crédito confirmado + cartão → carteira com código → cartões e históricos individuais.

## Limites e segurança

- Não alterar ledger, cooldown, limites, consentimento ou isolamento entre lojas.
- Manter chave de idempotência nos retries e remover formulário somente após resposta de sucesso.
- Mostrar apenas o cartão do QR na confirmação; demais cartões exigem OTP.
- Não oferecer resgate público: ao atingir a meta, orientar atendimento na loja.
- Sem migração, dependências ou variáveis novas.
- Para metas legadas acima de 12, usar progresso numérico/barra para não criar uma grade desproporcional.

## Verificação planejada

Lint, tipos, testes unitários existentes e E2E em desktop/mobile: crédito, cadastro, erro/bloqueio, OTP inválido, carteira vazia, 12 selos, meta completa e histórico por cartão. Revisar screenshot em largura de 320 px e mobile. Testes com respostas simuladas validam UI, não entrega real do WhatsApp.

## Fora desta entrega

Reenvio automático com contador, sessões persistentes da carteira e animação de novos selos ficam para evolução posterior. Uma resposta idempotente não distingue crédito novo de repetição: animar como novo poderia dar confirmação enganosa.

## Primeira entrega implementada e evidências

- `src/components/customer-loyalty-card.tsx` e CSS isolado: cartão reutilizável, saldo real, meta, selos e orientação para resgate.
- `/r/[token]`: confirmação substitui formulário, mantém identidade mascarada e direciona para consulta verificada. Retry mantém chave de idempotência.
- `/saldo`: cabeçalhos por etapa, telefone corrigível, erros sem avançar para carteira, vazio orientativo e histórico recolhível por cartão. Todos os cartões já mostram selos, sem exigir expansão.
- Sem animação nova; foco nas transições não desloca lateralmente a tela. Contêiner com overflow clip evita rolagem interna acidental após foco ou mudança de largura.
- `npm test`: 25 testes passaram.
- `npm run typecheck`: passou.
- `npm run lint`: sem erros; um aviso preexistente de imagem em `src/app/(merchant)/painel/qr-access.tsx`.
- `npx playwright test tests/e2e/customer-wallet-ui.spec.ts tests/e2e/loyalty.spec.ts`: 12 testes passaram nos projetos desktop e mobile. Inclui cadastro → crédito real no ambiente local → OTP local → carteira; loading, retry com mesma chave, bloqueio, erro de código, vazio, troca de número, histórico isolado e saldo acima da meta.
- Capturas revisadas da confirmação mobile e carteira a 320 px; teste de limites do cartão detecta corte lateral, além da checagem de largura do documento.

Os testes não comprovam entrega real do WhatsApp em produção. Não foram alteradas regras transacionais, banco ou configuração de provedor. Ainda cabe validação visual do responsável pelo produto antes de publicar.
