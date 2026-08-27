# Regras de negócio

## Identidade do cliente

- O cliente informa pelo menos um identificador aceito pela campanha.
- Telefone é o identificador recomendado para a experiência principal e deve ser normalizado em E.164.
- CPF é opcional, normalizado e validado. Não deve ser usado sozinho como segredo de autenticação.
- Exibir telefone e CPF sempre mascarados.
- Se telefone e CPF apontarem para clientes diferentes, bloquear a operação e encaminhar para resolução; não mesclar automaticamente.

## Consulta de saldo

- Consulta pública por telefone requer código de verificação enviado ao canal controlado pelo cliente.
- CPF pode ajudar a localizar a conta, mas não autoriza sozinho a exibição do saldo ou histórico.
- Depois da verificação, mostrar apenas dados da campanha solicitada e histórico resumido.
- O painel pode localizar cliente por telefone ou CPF exatos, sujeito à permissão e auditoria.

## Crédito por QR fixo — Sprint 1

- O QR identifica uma campanha ativa; o navegador não decide quantos pontos serão creditados.
- Crédito padrão: `Campaign.pointsPerClaim`.
- Um cliente não pode receber mais de um crédito por campanha dentro da janela de repetição configurada.
- Limite diário por cliente e por campanha deve ser configurável, com padrão conservador.
- Repetir a mesma requisição com a mesma chave idempotente retorna o resultado anterior.
- Campanha pausada, fora da vigência ou estabelecimento suspenso não gera pontos.
- Toda tentativa relevante gera informação suficiente para investigação sem registrar PII em claro.

`DECISÃO PENDENTE`: definir a janela inicial entre créditos do QR fixo. Sugestão para piloto: 12 horas, configurável por campanha.

`DECISÃO PENDENTE`: exigir OTP em toda leitura ou somente no primeiro cadastro/novo dispositivo. Produção deve equilibrar conversão e risco; nunca liberar consulta sensível apenas com CPF.

## Lançamento manual — Sprint 2

- Exige sessão ativa, permissão e motivo.
- Pontos permitidos e limites dependem do papel do usuário.
- Ajustes acima do limite exigem `OWNER` ou `MANAGER`.
- A operação aceita chave idempotente e gera auditoria.
- Correções não editam o ledger: criam ajuste ou reversão.
- O cliente pode ser localizado por telefone/CPF; criar novo cliente pelo painel exige os mesmos padrões de normalização e privacidade.

`DECISÃO PENDENTE`: limites por papel. Sugestão: `ATTENDANT` até o crédito padrão da campanha; `MANAGER` até 50 pontos por operação; `OWNER` sem limite de produto, mas sempre auditado.

## Resgate de recompensa — Sprint 2

- Resgate é iniciado e confirmado no painel por usuário autorizado.
- O cliente precisa ter saldo suficiente no momento do commit.
- O custo vem de `Reward.pointsCost`, nunca do navegador.
- Débito e registro do resgate ocorrem na mesma transação.
- Duplo clique, retry ou concorrência não podem duplicar o débito.
- Cancelamento cria uma movimentação compensatória e preserva o histórico.
- Não permitir saldo negativo.

## QR dinâmico — Sprint 3

- Tem início e expiração curtos e é gerado pelo servidor.
- Pode rotacionar automaticamente na tela do estabelecimento.
- Código expirado ou revogado não gera crédito.
- O token bruto é opaco, aleatório e armazenado apenas como hash.
- O mesmo cliente continua sujeito a janela e limites, mesmo usando tokens diferentes.
- A página deve lidar com rotação durante a leitura sem duplicar a operação.

`DECISÃO PENDENTE`: duração do token. Sugestão inicial: 60 a 120 segundos.

## QR de delivery — Sprint 4

- É associado a uma campanha e opcionalmente a uma referência de pedido.
- Tem quantidade de pontos definida pelo servidor e limite de usos, normalmente 1.
- Deve expirar em prazo configurável.
- Após o primeiro uso bem-sucedido, fica `REDEEMED` de forma atômica.
- Tentativas posteriores retornam mensagem neutra, sem identificar quem usou.
- A mesma referência de pedido não gera dois códigos ativos, salvo revogação explícita e auditada.
- Reimpressão mostra o mesmo código ativo; substituir código revoga o anterior.

`DECISÃO PENDENTE`: prazo inicial de expiração. Sugestão: 30 dias após a emissão.

## Campanhas e recompensas

- MVP: uma campanha ativa por estabelecimento.
- Alterar a regra da campanha não recalcula o passado.
- Alterar o custo de recompensa não altera resgates existentes.
- Pausar campanha impede novos créditos, mas o saldo continua consultável.
- Encerrar ou expirar pontos exige comunicação e regras legais específicas; não implementar expiração automática no MVP.

## WhatsApp — pós-MVP

- Usar para confirmação, OTP e avisos somente após consentimento e configuração do provedor.
- O registro de pontos deve concluir mesmo se a mensagem falhar.
- Envio ocorre de modo assíncrono, com retries limitados e idempotência.
- Templates, opt-out e retenção seguem as políticas do provedor e a legislação aplicável.

