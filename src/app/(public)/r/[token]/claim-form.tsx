"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift, UserRound } from "lucide-react";
import { CustomerLoyaltyCard, type CustomerCard } from "@/components/customer-loyalty-card";
import { MaskedDocumentInput } from "@/components/masked-document-input";

type Result = {
  status?: "credited" | "blocked" | "needs_registration";
  reason?: string;
  pointsAdded?: number;
  balance?: number;
  maskedIdentity?: string;
  error?: string;
};

export function ClaimForm({ token, card }: { token: string; card: Omit<CustomerCard, "balance"> }) {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result?.status === "credited") {
      successHeading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [result?.status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
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
      setResult(response.ok ? payload : { error: payload.error ?? "Não foi possível registrar. Tente novamente." });
      if (response.ok && payload.status === "needs_registration") setNeedsRegistration(true);
      if (response.ok && payload.status === "credited") {
        setNeedsRegistration(false);
      }
    } catch {
      setResult({ error: "Não foi possível conectar. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  if (result?.status === "credited" && typeof result.balance === "number") {
    return <div className="stack">
      <div>
        <p className="eyebrow">Compra registrada</p>
        <h1 ref={successHeading} tabIndex={-1}>Ponto registrado!</h1>
        <p role="status">{result.pointsAdded ?? 0} ponto{result.pointsAdded === 1 ? "" : "s"} registrado{result.pointsAdded === 1 ? "" : "s"} no seu cartão.</p>
        {result.maskedIdentity && <p className="compact-note">Cartão vinculado a {result.maskedIdentity}</p>}
      </div>
      <CustomerLoyaltyCard card={{ ...card, balance: result.balance }} />
      <Link href="/saldo">Ver meus cartões</Link>
      <p className="compact-note">Para consultar todos os cartões, confirme seu celular com um código.</p>
    </div>;
  }

  return (
    <>
    <p className="eyebrow">Registre sua compra</p>
    <h1>Sua compra vale pontos.</h1>
    <div className="reward-banner"><span className="reward-icon"><Gift size={22} /></span><span><small>Sua próxima recompensa</small><strong>{card.rewardTitle}</strong><span>Meta: {card.rewardThreshold} pontos</span></span></div>
    <form className="stack" onSubmit={submit} aria-busy={loading}>
      <div className="auth-section">
        <p className="compact-note">Informe seu WhatsApp para localizar seu cartão e registrar os pontos desta compra.</p>
        <label>
          WhatsApp
          <MaskedDocumentInput name="phone" type="phone" autoComplete="tel" required />
        </label>
      </div>

      {needsRegistration && (
        <>
          <hr />
          <div className="auth-section">
            <p className="eyebrow">Cadastro rápido</p>
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
    </form>
    <nav className="links"><Link href="/saldo">Consultar meus cartões</Link></nav>
    </>
  );
}
