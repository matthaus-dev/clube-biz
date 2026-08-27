import "server-only";
import { getEnv } from "@/lib/env";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendPasswordResetEmail(input: {
  to: string;
  ownerName: string;
  merchantName: string;
  resetUrl: string;
}): Promise<{ skipped: boolean }> {
  const env = getEnv();
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return { skipped: true };
  const ownerName = escapeHtml(input.ownerName);
  const merchantName = escapeHtml(input.merchantName);
  const resetUrl = escapeHtml(input.resetUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: "Redefina sua senha no clube-biz",
      text: [
        `Ola, ${input.ownerName}.`,
        "",
        `Recebemos uma solicitacao para redefinir a senha do painel ${input.merchantName}.`,
        `Acesse: ${input.resetUrl}`,
        "",
        "Se voce nao solicitou essa troca, ignore este e-mail.",
      ].join("\n"),
      html: `<p>Ola, ${ownerName}.</p><p>Recebemos uma solicitacao para redefinir a senha do painel ${merchantName}.</p><p><a href="${resetUrl}">Redefinir senha</a></p><p>Se voce nao solicitou essa troca, ignore este e-mail.</p>`,
    }),
  });

  if (!response.ok) throw new Error("RESEND_SEND_FAILED");
  return { skipped: false };
}
