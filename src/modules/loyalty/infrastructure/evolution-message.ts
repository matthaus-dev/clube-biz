import "server-only";
import { getEnv } from "@/lib/env";

export async function sendEvolutionText(phone: string, text: string): Promise<void> {
  const env = getEnv();
  if (env.OTP_DELIVERY_MODE === "console" && process.env.NODE_ENV !== "production") return;
  if (env.OTP_DELIVERY_MODE !== "evolution") throw new Error("MESSAGE_DELIVERY_UNAVAILABLE");

  try {
    if (!env.OTP_BASE_URL || !env.OTP_API_TOKEN || !env.OTP_INSTANCE) throw new Error();
    const url = new URL(env.OTP_BASE_URL);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error();
    url.pathname = `${url.pathname.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(env.OTP_INSTANCE)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env.OTP_API_TOKEN },
      body: JSON.stringify({ number: phone.replace(/^\+/, ""), text, linkPreview: false }),
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
      cache: "no-store",
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error();
  } catch {
    throw new Error("MESSAGE_DELIVERY_UNAVAILABLE");
  }
}
