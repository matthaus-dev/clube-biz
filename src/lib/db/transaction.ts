import { Prisma, type PrismaClient } from "@prisma/client";

export async function withSerializableRetry<T>(
  prisma: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code) &&
        attempt < 2
      ) continue;
      throw error;
    }
  }
  throw new Error("TRANSACTION_RETRY_EXHAUSTED");
}
