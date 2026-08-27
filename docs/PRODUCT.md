# Visão do produto

## Problema

Pequenos estabelecimentos precisam de um programa de fidelidade que seja simples para o cliente e não exija integração imediata com caixa, e-commerce ou plataforma de delivery.

## Proposta

O clube-biz oferece um cartão fidelidade digital por estabelecimento:

- o cliente lê um QR Code e se identifica;
- uma compra válida gera pontos;
- o cliente consulta seu saldo;
- o estabelecimento acompanha movimentações, registra ajustes e confirma resgates;
- QR Codes mais seguros são adicionados progressivamente, sem alterar o conceito central.

## Públicos

### Cliente

Quer acumular pontos sem instalar aplicativo e entender rapidamente quanto falta para receber uma recompensa.

### Estabelecimento

Quer criar uma campanha, reconhecer clientes recorrentes, corrigir situações manualmente e reduzir fraude sem operar um sistema complexo.

### Operação da plataforma

Precisa auditar movimentações, atender solicitações de privacidade e investigar abuso sem editar saldos diretamente no banco.

## Princípios

- Mobile first e sem aplicativo obrigatório.
- Uma ação principal por tela.
- O histórico financeiro de pontos é imutável; correções são novas movimentações.
- A segurança aumenta por sprint, mas controles básicos existem desde o primeiro lançamento.
- Integrações externas são opcionais e nunca são a única forma de concluir uma operação.
- O sistema é multiestabelecimento: dados, permissões e consultas sempre respeitam o estabelecimento.

## Jornada principal do MVP

1. O cliente lê o QR Code fixo do estabelecimento.
2. A página mostra o nome do estabelecimento e da campanha.
3. O cliente informa telefone e, opcionalmente, CPF conforme a política adotada.
4. A identidade é validada de acordo com o nível de risco.
5. O sistema registra a movimentação uma única vez.
6. A tela confirma os pontos recebidos e exibe o saldo.
7. No painel, o estabelecimento consulta o histórico e realiza resgate ou lançamento manual.

## Métricas iniciais

- taxa de conclusão: leitura do QR até crédito confirmado;
- clientes únicos ativos por estabelecimento;
- compras pontuadas e resgates por período;
- taxa de repetição em 30 dias;
- tentativas bloqueadas por duplicidade, limite ou código inválido;
- tempo mediano para registrar um ponto;
- volume de ajustes manuais e motivo.

## Fora do escopo inicial

- aplicativo nativo;
- marketplace de recompensas;
- pontos compartilhados entre estabelecimentos;
- pagamento dentro da plataforma;
- integração obrigatória com PDV;
- campanhas complexas por produto, faixa de horário ou valor gasto;
- envio automático por WhatsApp antes de o fluxo principal estar validado.

## Pós-MVP

- WhatsApp para confirmação de crédito, aviso de recompensa e consulta assistida;
- múltiplas campanhas por estabelecimento;
- importação de clientes;
- webhooks e integrações com PDV/delivery;
- relatórios avançados e segmentação;
- papéis adicionais para equipes maiores.

