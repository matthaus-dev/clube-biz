# Modelo de dados

## Convenções

- IDs não sequenciais, como UUID ou CUID.
- Datas em UTC e nomes `createdAt`, `updatedAt`, `expiresAt`.
- Dinheiro não faz parte do núcleo inicial. Pontos são inteiros.
- Telefone em formato E.164 normalizado.
- CPF normalizado para 11 dígitos, validado antes de persistir e nunca armazenado em texto puro.
- Campos sensíveis: valor cifrado para recuperação quando necessária e hash com pepper para busca exata.
- Exclusão lógica somente onde houver requisito real; ledger não é apagado por operação comum.

## Entidades

### Merchant

```text
id
name
slug                  UNIQUE
status                ACTIVE | SUSPENDED | ARCHIVED
timezone
createdAt
updatedAt
```

### MerchantUser

```text
id
merchantId            FK Merchant
emailNormalized
passwordHash          opcional conforme provedor de autenticação
role                  OWNER | MANAGER | ATTENDANT
status                ACTIVE | INVITED | DISABLED
lastLoginAt
createdAt
updatedAt

UNIQUE (merchantId, emailNormalized)
```

Permissões iniciais:

- `OWNER`: configuração, usuários, consultas, créditos e resgates;
- `MANAGER`: consultas, créditos, ajustes permitidos e resgates;
- `ATTENDANT`: localizar cliente, crédito manual e resgate, sem exportar dados.

### Customer

```text
id
firstName             nullable
lastName              nullable
emailNormalized       nullable
phoneEncrypted        nullable
phoneHash             nullable, indexado
cpfEncrypted          nullable
cpfHash               nullable, indexado
phoneVerifiedAt       nullable
status                ACTIVE | BLOCKED | ANONYMIZED
createdAt
updatedAt
```

Pelo menos um identificador deve existir. Duplicidades e mesclagem exigem uma política explícita. Não criar unicidade global simples em campos nulos sem testar o comportamento no PostgreSQL; prefira índices únicos parciais quando apropriado.

Nos fluxos públicos de QR e consulta de cartões, telefone é o único identificador aceito. CPF permanece para compatibilidade com dados legados e operações administrativas.

### CustomerConsent

```text
id
customerId            FK Customer
purpose               WELCOME_WHATSAPP
source                QR_REGISTRATION
grantedAt
revokedAt             nullable
createdAt
updatedAt

UNIQUE (customerId, purpose)
```

### MessageDelivery

```text
id
customerId            FK Customer
kind                  WELCOME_WHATSAPP
status                PENDING | PROCESSING | SENT | FAILED
attempts
lastAttemptAt         nullable
sentAt                nullable
createdAt
updatedAt

UNIQUE (customerId, kind)
```

O registro de entrega não duplica telefone ou conteúdo. A unicidade garante uma única boas-vindas por cliente global.

### Campaign

```text
id
merchantId            FK Merchant
name
status                DRAFT | ACTIVE | PAUSED | ENDED
pointsPerClaim         default 1
rewardThreshold       exemplo: 10
rewardTitle
startsAt              nullable
endsAt                nullable
createdAt
updatedAt

INDEX (merchantId, status)
```

No MVP, um estabelecimento tem uma campanha ativa por vez. Aplicar restrição ou validação transacional para impedir duas campanhas ativas.

### Membership

Relaciona cliente e campanha e materializa o saldo.

```text
id
campaignId            FK Campaign
customerId            FK Customer
balance               inteiro >= 0
lifetimeEarned        inteiro >= 0
lifetimeRedeemed      inteiro >= 0
createdAt
updatedAt

UNIQUE (campaignId, customerId)
```

### PointTransaction

Ledger imutável de pontos.

```text
id
merchantId            FK Merchant
campaignId            FK Campaign
membershipId          FK Membership
type                  EARN | REDEEM | ADJUSTMENT | REVERSAL | EXPIRATION
pointsDelta           inteiro diferente de 0; crédito positivo, débito negativo
source                STATIC_QR | DYNAMIC_QR | DELIVERY_QR | MANUAL | SYSTEM
status                POSTED | REVERSED
idempotencyKey
reasonCode            nullable
note                  nullable, nunca usar para PII
qrCodeId              nullable FK QrCode
redemptionId          nullable FK Redemption
actorMerchantUserId   nullable FK MerchantUser
requestFingerprint    nullable
reversesTransactionId nullable FK PointTransaction
createdAt

UNIQUE (merchantId, idempotencyKey)
INDEX (membershipId, createdAt)
INDEX (merchantId, createdAt)
```

Movimentações publicadas não são editadas ou apagadas. Uma correção cria `REVERSAL` ou `ADJUSTMENT` ligado ao evento original.

### Reward

```text
id
campaignId            FK Campaign
name
description           nullable
pointsCost
status                ACTIVE | INACTIVE
createdAt
updatedAt

INDEX (campaignId, status)
```

Mesmo que a primeira tela configure apenas uma recompensa, modelá-la como entidade evita migração destrutiva depois.

### Redemption

```text
id
merchantId            FK Merchant
campaignId            FK Campaign
membershipId          FK Membership
rewardId              FK Reward
pointsSpent
status                CONFIRMED | CANCELLED
idempotencyKey
actorMerchantUserId   FK MerchantUser
cancelledAt           nullable
createdAt

UNIQUE (merchantId, idempotencyKey)
```

### QrCode

Um modelo atende os três tipos de QR.

```text
id
merchantId            FK Merchant
campaignId            FK Campaign
kind                  STATIC | DYNAMIC | DELIVERY
tokenHash             UNIQUE
status                ACTIVE | REDEEMED | EXPIRED | REVOKED
points                 inteiro > 0
orderReference        nullable
maxUses               nullable; STATIC pode ter muitos usos, DELIVERY normalmente 1
usedCount              default 0
validFrom              nullable
expiresAt              nullable
createdByUserId        nullable FK MerchantUser
createdAt
updatedAt

INDEX (merchantId, kind, status)
UNIQUE (merchantId, orderReference) quando aplicável ao delivery
```

Armazenar apenas hash do token. O valor bruto aparece na URL e não deve ser persistido nem registrado em logs.

### QrClaim

Registra tentativa/uso do código e sustenta antifraude e idempotência.

```text
id
qrCodeId              FK QrCode
customerId            FK Customer
membershipId          nullable FK Membership
pointTransactionId    nullable FK PointTransaction
status                SUCCEEDED | REJECTED | DUPLICATE
reasonCode            nullable
idempotencyKey
ipHash                 nullable
userAgentHash          nullable
claimedAt

UNIQUE (qrCodeId, idempotencyKey)
INDEX (customerId, claimedAt)
INDEX (qrCodeId, claimedAt)
```

### IdentityChallenge

```text
id
customerId            nullable FK Customer
channel               SMS | WHATSAPP
destinationHash
codeHash
purpose               CLAIM | BALANCE_LOOKUP
attempts
status                PENDING | VERIFIED | EXPIRED | BLOCKED
expiresAt
verifiedAt            nullable
createdAt
```

Guardar OTP somente como hash, com validade curta e limite de tentativas.

### AuditLog

```text
id
merchantId            nullable FK Merchant
actorMerchantUserId   nullable FK MerchantUser
action
entityType
entityId
metadata              JSON sem PII ou segredos
requestId
createdAt

INDEX (merchantId, createdAt)
```

## Invariantes obrigatórias

- `Membership.balance` nunca é negativo.
- A soma do ledger publicado deve reconciliar com o saldo materializado.
- Um débito de resgate e o respectivo `Redemption` são criados na mesma transação.
- Um delivery QR com `maxUses = 1` não pode produzir duas transações, mesmo sob concorrência.
- Um usuário de estabelecimento nunca atua fora de seu `merchantId`.
- Pontos e campanha de um QR são determinados pelo registro no servidor.

## Migrações e seed

O seed de desenvolvimento deve criar:

- um estabelecimento de demonstração;
- um usuário proprietário;
- uma campanha ativa de 1 ponto por leitura;
- uma recompensa de 10 pontos;
- um QR estático de desenvolvimento com token conhecido apenas no ambiente local;
- dois clientes e algumas movimentações para o dashboard.
