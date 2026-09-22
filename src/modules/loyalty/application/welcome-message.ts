import type { PrismaClient } from "@prisma/client";
import { getEnv } from "@/lib/env";
import { decryptPii } from "@/lib/security/pii";
import { sendEvolutionText } from "@/modules/loyalty/infrastructure/evolution-message";

function welcomeText(firstName: string | null, walletUrl: string): string {
  const greeting = firstName?.trim() ? `Olá, ${firstName.trim()}! 👋` : "Olá! 👋";
  return `${greeting} Seja bem-vindo(a) ao Clube Biz.

Seu primeiro cartão fidelidade foi criado. Ao ler o QR Code dos estabelecimentos participantes, você acumula pontos nos cartões de cada clube.

Acompanhe seus cartões, saldos e recompensas:
${walletUrl}

Para acessar, informe este mesmo número e confirme o código enviado pelo WhatsApp.

Se você não fez este cadastro, ignore esta mensagem.`;
}

export async function dispatchWelcomeMessage(
  prisma: PrismaClient,
  messageId: string,
  now = new Date(),
): Promise<"sent" | "failed" | "skipped"> {
  const claimed = await prisma.messageDelivery.updateMany({
    where: { id: messageId, kind: "WELCOME_WHATSAPP", status: "PENDING" },
    data: { status: "PROCESSING", attempts: { increment: 1 }, lastAttemptAt: now },
  });
  if (claimed.count !== 1) return "skipped";

  try {
    const delivery = await prisma.messageDelivery.findUniqueOrThrow({
      where: { id: messageId },
      include: {
        customer: {
          include: {
            consents: {
              where: { purpose: "WELCOME_WHATSAPP", revokedAt: null },
              take: 1,
            },
          },
        },
      },
    });
    if (!delivery.customer.phoneEncrypted || delivery.customer.consents.length !== 1) throw new Error();

    const env = getEnv();
    const phone = decryptPii(delivery.customer.phoneEncrypted, env.PII_ENCRYPTION_KEY);
    const walletUrl = new URL("/saldo", env.APP_URL).toString();
    await sendEvolutionText(phone, welcomeText(delivery.customer.firstName, walletUrl));
    await prisma.messageDelivery.updateMany({
      where: { id: messageId, status: "PROCESSING" },
      data: { status: "SENT", sentAt: now },
    });
    return "sent";
  } catch {
    await prisma.messageDelivery.updateMany({
      where: { id: messageId, status: "PROCESSING" },
      data: { status: "FAILED" },
    });
    return "failed";
  }
}
