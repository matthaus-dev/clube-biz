# clube-biz

Aplicacao de cartao fidelidade em Next.js, PostgreSQL e Prisma.

## Requisitos

- Node.js 22 ou superior
- npm
- PostgreSQL 15 ou superior

## Ambiente local

1. Copie `.env.example` para `.env`.
2. Substitua os valores de segredo por valores locais fortes.
3. Crie o banco indicado por `DATABASE_URL`.
4. Execute:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

O seed informa a URL do QR de demonstracao. O estabelecimento de teste usa o slug `pizzaria-demo` nas telas publicas.

Login local criado pelo seed:

- e-mail: `dono@demo.local`;
- senha: valor de `DEV_MERCHANT_PASSWORD` ou `ClubeBiz123!` apenas no desenvolvimento.

O login do painel usa apenas e-mail e senha. O estabelecimento e identificado pelo usuario lojista.

No desenvolvimento, o adaptador OTP devolve o codigo na propria tela. Essa resposta e automaticamente desabilitada em producao.

Para envio real de recuperacao de senha, configure `RESEND_API_KEY` e `RESEND_FROM_EMAIL`.

## Verificacoes

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Testes de integracao exigem um PostgreSQL separado e configurado pelas variaveis de ambiente do processo de teste.

## Documentacao

Consulte [`docs/README.md`](docs/README.md) para visao do produto, arquitetura e sprints.
