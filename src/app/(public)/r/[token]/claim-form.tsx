"use client";

import { FormEvent, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { MaskedDocumentInput } from "@/components/masked-document-input";

type Result = {
  status?: "credited" | "blocked" | "needs_registration";
  reason?: string;
  pointsAdded?: number;
  balance?: number;
  maskedIdentity?: string;
  error?: string;
};

export function ClaimForm({ token }: { token: string }) {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/public/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          phone: form.get("phone"),
          firstName: needsRegistration ? form.get("firstName") : undefined,
          lastName: needsRegistration ? form.get("lastName") || undefined : undefined,
          whatsappConsent: needsRegistration ? form.get("whatsappConsent") === "on" : undefined,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const payload = await response.json() as Result;
      setResult(payload);
      if (response.ok && payload.status === "needs_registration") setNeedsRegistration(true);
      if (response.ok && payload.status === "credited") {
        setNeedsRegistration(false);
        idempotencyKey.current = crypto.randomUUID();
        formElement.reset();
      }
    } catch {
      setResult({ error: "Nao foi possivel conectar. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="auth-section">
        <p className="compact-note">Informe seu número de WhatsApp para localizar seu cartão.</p>
        <label>
          WhatsApp
          <MaskedDocumentInput name="phone" type="phone" autoComplete="tel" required />
        </label>
      </div>

      {needsRegistration && (
        <>
          <hr />
          <div className="auth-section">
            <p className="eyebrow">Cadastro rapido</p>
            <label>Nome <span className="input-with-icon"><UserRound size={17} /><input name="firstName" autoComplete="given-name" placeholder="Seu nome" required /></span></label>
            <label>Sobrenome <span className="muted">(opcional)</span><input name="lastName" autoComplete="family-name" placeholder="Seu sobrenome" /></label>
            <label className="checkbox-label"><input name="whatsappConsent" type="checkbox" required /> Aceito receber pelo WhatsApp mensagens transacionais do Clube Biz sobre meu cadastro e acesso aos meus cartões.</label>
          </div>
        </>
      )}

      <button disabled={loading} type="submit">
        {loading ? "Registrando..." : needsRegistration ? "Criar cadastro e registrar ponto" : "Continuar"}
      </button>
      {result?.error && <p className="message error" role="alert">{result.error}</p>}
      {result?.status === "needs_registration" && <p className="message" role="status">{result.reason}</p>}
      {result?.status === "blocked" && <p className="message" role="status">{result.reason}</p>}
      {result?.status === "credited" && (
        <div className="message" role="status">
          <strong>Compra registrada!</strong>
          <p>Voce ganhou {result.pointsAdded} ponto(s). Saldo de {result.maskedIdentity}:</p>
          <p className="balance">{result.balance} ponto(s)</p>
        </div>
      )}
    </form>
  );
}
