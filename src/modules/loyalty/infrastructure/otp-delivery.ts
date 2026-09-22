import "server-only";
import { sendEvolutionText } from "./evolution-message";

export async function deliverOtp(phone: string, code: string): Promise<void> {
  try {
    await sendEvolutionText(
      phone,
      `Seu código de verificação do Clube Biz é ${code}. Ele expira em 5 minutos. Não compartilhe este código. Se não solicitou, ignore esta mensagem.`,
    );
  } catch {
    throw new Error("OTP_DELIVERY_UNAVAILABLE");
  }
}
