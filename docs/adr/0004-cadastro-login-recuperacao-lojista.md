# ADR 0004 - Cadastro, login e recuperacao de senha do lojista

## Status

Aceito.

## Contexto

O login do painel nao deve exigir que o lojista informe o estabelecimento. O sistema deve descobrir o tenant pelo usuario autenticado. O cadastro inicial tambem precisa criar o cartao fidelidade basico sem depender de configuracao posterior.

## Decisao

- `MerchantUser.emailNormalized` passa a ser unico globalmente para permitir login por e-mail e senha.
- O cadastro cria `Merchant` ativo, `MerchantUser` OWNER ativo, `Campaign` ativa e `Reward` ativa em uma unica transacao.
- Os dados iniciais do cartao sao: nome publico, texto da recompensa e meta em pontos.
- A recuperacao de senha usa token opaco aleatorio, persistido apenas como hash, com validade de 30 minutos.
- O link de redefinicao e enviado por e-mail via Resend depois da criacao do token no banco.
- Respostas de solicitacao de recuperacao permanecem neutras para evitar enumeracao de contas.
- Ao redefinir a senha, sessoes abertas do usuario sao revogadas.

## Consequencias

- Um mesmo e-mail nao pode pertencer a mais de um lojista.
- Ambientes que enviam e-mail real precisam configurar `RESEND_API_KEY` e `RESEND_FROM_EMAIL`.
- O slug do estabelecimento continua existindo para URLs publicas e consulta de saldo, mas deixa de ser campo de login do painel.
