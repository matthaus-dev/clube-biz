import type { Prisma, PrismaClient } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { keyedHash } from "@/lib/security/hash";
import { encryptPii } from "@/lib/security/pii";
import { normalizeCpf, normalizePhone } from "../domain/identity";

type DbClient = Prisma.TransactionClient | PrismaClient;

export type ProtectedIdentity = {
  phone: string | null;
  phoneHash: string | null;
  phoneEncrypted: string | null;
  cpf: string | null;
  cpfHash: string | null;
  cpfEncrypted: string | null;
};

export type CustomerProfileInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

function cleanOptional(value?: string | null): string | null {
  const clean = value?.trim();
  return clean ? clean : null;
}

export function protectIdentity(phoneInput?: string | null, cpfInput?: string | null): ProtectedIdentity {
  const env = getEnv();
  const phoneRaw = cleanOptional(phoneInput);
  const cpfRaw = cleanOptional(cpfInput);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const cpf = cpfRaw ? normalizeCpf(cpfRaw) : null;
  if (!phone && !cpf) throw new Error("IDENTITY_REQUIRED");
  return {
    phone,
    phoneHash: phone ? keyedHash(phone, env.PII_HASH_PEPPER) : null,
    phoneEncrypted: phone ? encryptPii(phone, env.PII_ENCRYPTION_KEY) : null,
    cpf,
    cpfHash: cpf ? keyedHash(cpf, env.PII_HASH_PEPPER) : null,
    cpfEncrypted: cpf ? encryptPii(cpf, env.PII_ENCRYPTION_KEY) : null,
  };
}

function profileData(profile?: CustomerProfileInput) {
  return {
    firstName: cleanOptional(profile?.firstName),
    lastName: cleanOptional(profile?.lastName),
    emailNormalized: cleanOptional(profile?.email)?.toLowerCase() ?? null,
  };
}

export async function findCustomerByIdentity(db: DbClient, identity: ProtectedIdentity) {
  const alternatives: Array<{ phoneHash: string } | { cpfHash: string }> = [];
  if (identity.phoneHash) alternatives.push({ phoneHash: identity.phoneHash });
  if (identity.cpfHash) alternatives.push({ cpfHash: identity.cpfHash });

  const matches = await db.customer.findMany({
    where: { OR: alternatives },
    take: 2,
  });

  if (matches.length > 1) throw new Error("IDENTITY_CONFLICT");
  const match = matches[0];
  if (!match) return null;
  if (identity.phoneHash && match.phoneHash && match.phoneHash !== identity.phoneHash) throw new Error("IDENTITY_CONFLICT");
  if (identity.cpfHash && match.cpfHash && match.cpfHash !== identity.cpfHash) throw new Error("IDENTITY_CONFLICT");
  return match;
}

export async function findOrCreateCustomerWithState(db: DbClient, identity: ProtectedIdentity, profile?: CustomerProfileInput) {
  const match = await findCustomerByIdentity(db, identity);
  const profileValues = profileData(profile);

  if (match) {
    const data: Prisma.CustomerUpdateInput = {};
    if (!match.phoneHash && identity.phoneHash) {
      data.phoneHash = identity.phoneHash;
      data.phoneEncrypted = identity.phoneEncrypted;
    }
    if (!match.cpfHash && identity.cpfHash) {
      data.cpfHash = identity.cpfHash;
      data.cpfEncrypted = identity.cpfEncrypted;
    }
    if (!match.firstName && profileValues.firstName) data.firstName = profileValues.firstName;
    if (!match.lastName && profileValues.lastName) data.lastName = profileValues.lastName;
    if (!match.emailNormalized && profileValues.emailNormalized) data.emailNormalized = profileValues.emailNormalized;

    const customer = Object.keys(data).length ? await db.customer.update({ where: { id: match.id }, data }) : match;
    return { customer, created: false };
  }

  const customer = await db.customer.create({
    data: {
      phoneHash: identity.phoneHash,
      phoneEncrypted: identity.phoneEncrypted,
      cpfHash: identity.cpfHash,
      cpfEncrypted: identity.cpfEncrypted,
      firstName: profileValues.firstName,
      lastName: profileValues.lastName,
      emailNormalized: profileValues.emailNormalized,
    },
  });
  return { customer, created: true };
}

export async function findOrCreateCustomer(db: DbClient, identity: ProtectedIdentity, profile?: CustomerProfileInput) {
  return (await findOrCreateCustomerWithState(db, identity, profile)).customer;
}
