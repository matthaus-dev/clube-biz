"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MaskedDocumentInput } from "@/components/masked-document-input";
import { CustomerLoyaltyCard, type CustomerCard } from "@/components/customer-loyalty-card";

type Challenge = { challengeId: string; devCode?: string; error?: string };
type WalletCard = CustomerCard & { history: Array<{ type: string; pointsDelta: number; createdAt: string }> };
type Balance = { cards?: WalletCard[]; error?: string };

export function BalanceForm() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef("phone");
  const step = balance ? "wallet" : challenge ? "code" : "phone";

  useEffect(() => {
    if (previousStep.current !== step) {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    previousStep.current = step;
  }, [step]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/public/balance/challenge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = await response.json() as Challenge;
      if (!response.ok || !payload.challengeId) {
        setError(payload.error ?? "Não foi possível enviar o código. Confira o número e tente novamente.");
      } else setChallenge(payload);
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    finally { setLoading(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || loading) return;
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/balance/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, code: form.get("code") }),
      });
      const payload = await response.json() as Balance;
      if (!response.ok || payload.error) setError(payload.error ?? "Código inválido ou expirado. Tente novamente ou solicite outro código.");
      else setBalance(payload);
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    finally { setLoading(false); }
  }

  return <div className="stack">
    <header>
      <p className="eyebrow">{step === "wallet" ? "Sua carteira" : "Meus cartões"}</p>
      <h1 ref={heading} tabIndex={-1}>{step === "wallet" ? "Meus cartões" : step === "code" ? "Confirme seu celular." : "Seus cartões, em um só lugar."}</h1>
      <p className="muted">{step === "wallet" ? "Acompanhe seus pontos e veja quanto falta para cada recompensa." : step === "code" ? `Digite o código enviado ao celular com final ${phone.replace(/\D/g, "").slice(-4)}.` : "Informe seu WhatsApp. Vamos enviar um código para consultar seus cartões com segurança."}</p>
    </header>

    {step === "phone" && <form className="stack" onSubmit={start} aria-busy={loading}>
      <label>WhatsApp <MaskedDocumentInput name="phone" type="phone" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.currentTarget.value)} /></label>
      <button disabled={loading}>{loading ? "Enviando…" : "Enviar código pelo WhatsApp"}</button>
    </form>}

    {step === "code" && <form className="stack" onSubmit={verify} aria-busy={loading}>
      {challenge?.devCode && <p className="message"><strong>Ambiente local:</strong> use o código {challenge.devCode}</p>}
      <label>Código de 6 dígitos <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-describedby="code-help" /></label>
      <p id="code-help" className="compact-note">Não recebeu ou o código expirou? Confira seu número e solicite outro código.</p>
      <button disabled={loading}>{loading ? "Verificando…" : "Ver meus cartões"}</button>
      <button type="button" className="customer-secondary-button" disabled={loading} onClick={() => { setChallenge(null); setError(null); }}>Corrigir número ou pedir novo código</button>
    </form>}

    {error && <p className="message error" role="alert">{error}</p>}

    {step === "wallet" && <div className="stack">
      {!(balance?.cards?.length) && <p className="message" role="status">Você ainda não tem cartões ativos. Leia o QR Code de uma loja participante para começar a pontuar.</p>}
      {(balance?.cards ?? []).map((card, index) => <section key={`${card.merchantName}-${card.campaignName}-${index}`} aria-label={`Pontos e histórico de ${card.merchantName}`}>
        <CustomerLoyaltyCard card={card} />
        <details className="customer-card-history">
          <summary>Últimas movimentações de {card.merchantName}</summary>
          {card.history.length ? <ul className="history-list">{card.history.map((item, itemIndex) => <li key={`${item.createdAt}-${itemIndex}`}>
            <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>
            <strong className={item.pointsDelta >= 0 ? "points-positive" : "points-negative"}>{item.pointsDelta > 0 ? "+" : ""}{item.pointsDelta} ponto{Math.abs(item.pointsDelta) === 1 ? "" : "s"}</strong>
          </li>)}</ul> : <p className="compact-note">Nenhuma movimentação recente neste cartão.</p>}
        </details>
      </section>)}
    </div>}
  </div>;
}
