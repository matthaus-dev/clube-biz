# Segurança, privacidade e antifraude

## Modelo de ameaça resumido

Principais riscos:

- foto ou compartilhamento de QR fixo;
- repetição de requisição, duplo clique e corrida concorrente;
- adivinhação ou vazamento de token;
- enumeração de telefone/CPF na consulta de saldo;
- usuário de um estabelecimento acessando outro tenant;
- abuso de lançamento manual ou resgate;
- exposição de PII em logs, URLs, analytics ou backups;
- falsificação de IP por cabeçalhos não confiáveis.

## Controles obrigatórios desde a Sprint 1

- HTTPS em todos os ambientes públicos.
- Tokens aleatórios de alta entropia; persistir apenas hash.
- Validação de entrada com schema e limites de tamanho.
- Idempotência no endpoint de crédito.
- Restrição de frequência por cliente, QR/campanha, IP e dispositivo como sinais combinados.
- Mensagens neutras para evitar enumeração de contas.
- Telefone/CPF cifrados em repouso e hashes com pepper para busca exata.
- Segredos fora do repositório, com rotação planejada.
- Cookies `HttpOnly`, `Secure`, `SameSite=Lax` ou mais restritivo para sessões.
- Proteção CSRF nos comandos autenticados quando a estratégia de sessão exigir.
- Cabeçalhos de segurança e política de conteúdo compatível com a aplicação.
- Queries sempre limitadas pelo tenant obtido da sessão.

## QR fixo: risco aceito temporariamente

Um QR fixo pode ser fotografado e usado fora do local. Na Sprint 1, reduzir o risco com:

- janela mínima entre créditos do mesmo cliente;
- limite diário por cliente e campanha;
- rate limit por rede e impressão do cliente;
- detecção de picos e auditoria;
- opção de pausar ou trocar o código;
- OTP no primeiro uso e em situações de risco.

Geolocalização não deve ser controle único: pode ser negada, falsificada e excluir clientes. Se usada, tratar apenas como sinal, com consentimento.

## QR dinâmico e delivery

- Assinar ou gerar token opaco com no mínimo 128 bits de aleatoriedade efetiva.
- Comparar hashes de forma segura.
- Verificar status e validade no servidor dentro da mesma transação do uso.
- Para uso único, fazer transição condicional `ACTIVE -> REDEEMED`; apenas o vencedor recebe pontos.
- Não incluir telefone, CPF, saldo, valor do pedido ou ID interno previsível na URL.
- Revogação e substituição devem ser auditadas.

## Autenticação e autorização do painel

- Sessões com expiração, rotação e revogação.
- Senhas, se usadas, com algoritmo moderno oferecido por biblioteca mantida.
- Rate limit e proteção contra credenciais comprometidas no login.
- MFA recomendado para `OWNER`, obrigatório antes de funções de alto impacto em produção.
- Autorização por caso de uso e papel; esconder botão não é controle de segurança.
- Reautenticação para exportação, gestão de usuários e operações sensíveis futuras.

## Proteção de dados

- Coletar apenas dados necessários e documentar finalidade e retenção.
- Separar criptografia recuperável de hash de busca.
- O pepper não fica no banco. Chaves devem ser versionadas para permitir rotação.
- Mascarar dados na UI e impedir cache compartilhado de páginas sensíveis.
- Não enviar PII a analytics, error tracking ou logs.
- Implementar exportação, correção, bloqueio e anonimização conforme a política aplicável.
- Preservar ledger por obrigação de auditoria sem manter identificadores pessoais desnecessários.
- Fazer revisão jurídica/LGPD antes de produção; este documento não substitui aconselhamento jurídico.

## Rate limiting

Aplicar políticas distintas a:

- visualização de QR;
- tentativas de crédito;
- início e validação de OTP;
- consulta de saldo;
- login;
- lançamentos manuais e resgates.

Em produção com múltiplas instâncias, usar armazenamento compartilhado. Não confiar apenas em memória do processo.

## Auditoria

Registrar:

- login e falhas relevantes;
- crédito, débito, ajuste, reversão e resgate;
- criação, revogação e substituição de QR;
- alteração de campanha, recompensa, usuário e permissão;
- consulta administrativa de dados sensíveis e exportação futura.

O log deve indicar ator, tenant, ação, entidade, horário, resultado e `requestId`, sem PII em claro.

## Checklist antes de produção

- [ ] revisão de autorização entre tenants;
- [ ] testes de concorrência e idempotência;
- [ ] política de backup e restauração testada;
- [ ] rotação de segredos e chaves documentada;
- [ ] CSP, cookies e cabeçalhos verificados;
- [ ] dependências e imagens verificadas;
- [ ] alertas de abuso e erros críticos ativos;
- [ ] política de privacidade e termos disponíveis;
- [ ] fluxo de anonimização e atendimento LGPD testado;
- [ ] resposta a incidentes e contatos definidos.

