# ADR 0005 - Cadastro rapido do cliente no QR fixo

## Status

Aceito, com a identidade publica atualizada pelo ADR 0007.

## Contexto

O cliente chega pela URL fixa do QR. Essa URL ja identifica o estabelecimento, a campanha e a regra de pontos, entao a tela publica de leitura nao deve pedir nome ou slug do estabelecimento.

## Decisao

- A rota `/r/:token` continua resolvendo estabelecimento e campanha no servidor pelo hash do token do QR.
- O cliente informa celular ou CPF para localizacao.
- Se nao houver cadastro vinculado aquela campanha, a API retorna estado de cadastro rapido.
- O cadastro rapido exige nome e aceita sobrenome e e-mail como opcionais.
- `Customer` permanece global; o vinculo com cada estabelecimento/campanha continua sendo `Membership`.
- Um mesmo `Customer` pode ter varias memberships em estabelecimentos diferentes.
- Telefone e CPF continuam cifrados e buscados por hash; o navegador nunca envia `merchantId`, `campaignId` ou quantidade de pontos como autoridade.

## Consequencias

- Clientes antigos sem nome continuam validos.
- Novos cadastros originados pelo QR passam a preencher dados minimos de perfil.
- A consulta publica de saldo fora do QR ainda precisa identificar o estabelecimento, porque essa rota nao carrega token de campanha.
