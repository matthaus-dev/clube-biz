import "server-only";
import { getEnv } from "@/lib/env";

export async function deliverOtp(phone: string, code: string): Promise<void> {
  const env = getEnv();
  if (env.OTP_DELIVERY_MODE === "console" && process.env.NODE_ENV !== "production") return;
  if (env.OTP_DELIVERY_MODE !== "evolution") throw new Error("OTP_DELIVERY_UNAVAILABLE");

  // Never propagate provider responses/errors: they may contain the OTP or destination.
  try {
    if (!env.OTP_BASE_URL || !env.OTP_API_TOKEN || !env.OTP_INSTANCE) throw new Error();
    const url = new URL(env.OTP_BASE_URL);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error();
    url.pathname = `${url.pathname.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(env.OTP_INSTANCE)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env.OTP_API_TOKEN },
      body: JSON.stringify({
        number: phone.replace(/^\+/, ""),
        text: `Seu código de verificação do Clube Biz é ${code}. Ele expira em 5 minutos. Não compartilhe este código. Se não solicitou, ignore esta mensagem.`,
        linkPreview: false,
      }),
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
      cache: "no-store",
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error();
  } catch {
    throw new Error("OTP_DELIVERY_UNAVAILABLE");
  }
}
