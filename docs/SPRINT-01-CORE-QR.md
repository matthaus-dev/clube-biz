# Sprint 1 — Ler QR Code e registrar ponto

## Resultado esperado

Um cliente lê o QR fixo de um estabelecimento, se identifica, recebe o crédito permitido uma única vez e vê seu saldo. Também consegue iniciar uma consulta de saldo com verificação de identidade.

## Pré-requisitos de decisão

- [ ] Confirmar janela entre créditos do QR fixo; usar 12 horas como padrão provisório.
- [ ] Confirmar limite diário; usar 2 créditos como padrão provisório.
- [ ] Confirmar política de OTP no crédito; implementar interface que permita endurecer a regra sem reescrever o caso de uso.
- [ ] Definir provedor de SMS/OTP ou adaptador local para desenvolvimento.

## Histórias

### S1.1 — Fundação do projeto

Como equipe, quero uma base executável e testável para evoluir o produto com segurança.

Tarefas:

- [ ] Inicializar Next.js App Router com TypeScript.
- [ ] Configurar PostgreSQL e Prisma.
- [ ] Adicionar validação de ambiente e `.env.example`.
- [ ] Configurar lint, formato, tipos e testes.
- [ ] Criar tratamento padronizado de erros e logs sem PII.
- [ ] Preparar banco isolado para testes de integração.
- [ ] Documentar execução local no `README.md` do código.

Critérios de aceite:

- aplicação inicia localmente com um comando documentado;
- migração funciona em banco vazio;
- seed é repetível em desenvolvimento;
- CI ou comando equivalente executa lint, tipos e testes.

### S1.2 — Domínio e persistência

Como sistema, quero registrar clientes, campanhas, associações e movimentações de forma consistente.

Tarefas:

- [ ] Implementar modelos mínimos descritos em `DATA-MODEL.md`.
- [ ] Criar migração com constraints e índices.
- [ ] Criar serviço de normalização, cifragem e hash de telefone/CPF.
- [ ] Criar serviço transacional único para movimentar pontos.
- [ ] Implementar reconciliação de saldo para testes/admin futuro.
- [ ] Criar seed com comércio, campanha, recompensa e QR fixo.

Critérios de aceite:

- saldo não fica negativo;
- retry com mesma idempotency key não duplica ledger;
- duas requisições concorrentes não perdem atualização;
- telefone/CPF não aparecem em claro no banco nem logs;
- ledger e saldo materializado reconciliam.

### S1.3 — Página pública do QR

Como cliente, quero abrir o QR e entender onde estou pontuando.

Tarefas:

- [ ] Criar `/r/[token]` mobile first.
- [ ] Resolver token por hash e validar estabelecimento/campanha/status.
- [ ] Exibir nome, campanha, recompensa e formulário simples.
- [ ] Validar e normalizar telefone; aceitar CPF somente conforme configuração.
- [ ] Implementar estados de código inválido, campanha pausada e indisponibilidade.
- [ ] Não colocar PII em query string, URL ou analytics.

Critérios de aceite:

- QR válido abre página correta sem revelar IDs internos;
- QR desconhecido retorna resposta neutra;
- formulário funciona por teclado e leitor de tela em nível básico;
- nenhum valor de pontos enviado pelo navegador é considerado autoridade.

### S1.4 — Claim e crédito

Como cliente, quero que minha compra gere pontos sem risco de cobrança duplicada.

Tarefas:

- [ ] Criar endpoint/caso de uso `ClaimStaticQr`.
- [ ] Criar ou localizar cliente e `Membership` com segurança contra corrida.
- [ ] Aplicar janela de repetição e limite diário.
- [ ] Adicionar rate limit e idempotência.
- [ ] Criar `QrClaim`, `PointTransaction` e atualizar saldo na mesma transação.
- [ ] Exibir confirmação com saldo e identificador mascarado.
- [ ] Emitir métricas de sucesso, duplicidade e bloqueio.

Critérios de aceite:

- primeiro claim elegível credita a quantidade definida no servidor;
- retry e duplo clique retornam o mesmo resultado;
- claim fora da janela/limite não altera saldo;
- campanha pausada durante a operação não credita;
- falha após a validação não deixa ledger e saldo divergentes.

### S1.5 — Consulta de saldo

Como cliente, quero consultar meu saldo sem expor minha conta a terceiros.

Tarefas:

- [ ] Criar tela de consulta por telefone e suporte opcional a CPF para localização.
- [ ] Implementar desafio OTP com adaptador de provedor.
- [ ] Armazenar somente hash do OTP, validade curta e contador de tentativas.
- [ ] Aplicar rate limit por destino, IP e sessão.
- [ ] Após verificação, mostrar saldo da campanha e histórico resumido.
- [ ] Usar resposta neutra quando o cliente não existir.

Critérios de aceite:

- CPF sozinho não revela saldo;
- OTP expirado ou excedido é rejeitado;
- resposta pública não permite enumerar clientes;
- consulta verificada nunca mostra dados de outro cliente/campanha.

### S1.6 — Testes do caminho crítico

- [ ] E2E: QR válido → identificação → crédito → saldo.
- [ ] E2E: consulta de saldo com OTP do adaptador de teste.
- [ ] Integração: retry idempotente.
- [ ] Integração: dois claims concorrentes.
- [ ] Integração: limite e janela com relógio controlado.
- [ ] Integração: campanha pausada/expirada.
- [ ] Segurança: token inválido, input excessivo e tentativa de alterar pontos.
- [ ] Privacidade: logs e erros não contêm telefone/CPF.

## Ordem recomendada para o Codex CLI

1. S1.1 e S1.2.
2. S1.3 e S1.4.
3. S1.5.
4. S1.6, documentação e revisão final.

Implementar uma história por vez. Ao fim de cada história, rodar verificações e relatar evidências antes de seguir.

## Definição de pronto

- todos os critérios de aceite atendidos;
- migração, seed e execução local documentados;
- caminho principal coberto por E2E;
- idempotência e concorrência cobertas com PostgreSQL;
- sem PII/segredos em claro;
- pendências de produto registradas, sem TODO oculto no caminho crítico.

