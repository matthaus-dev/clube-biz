"use client";

import { FormEvent, useState } from "react";
import { Check } from "lucide-react";
import { MaskedDocumentInput } from "@/components/masked-document-input";

type Challenge = { challengeId: string; devCode?: string; error?: string };
type Balance = {
  balance: number;
  history: Array<{ type: string; pointsDelta: number; createdAt: string }>;
  error?: string;
  cards?: Array<{ merchantName: string; campaignName: string; rewardTitle: string; balance: number; rewardThreshold: number; history: Balance["history"] }>;
};

export function BalanceForm() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setChallenge(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/balance/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.get("phone"),
        }),
      });
      const payload = await response.json() as Challenge & Balance;
      if (payload.cards && !payload.challengeId) setBalance({ balance: payload.cards[0]?.balance ?? 0, history: [], cards: payload.cards });
      else setChallenge(payload);
    } catch {
      setChallenge({ challengeId: "", error: "Não foi possível conectar." });
    } finally {
      setLoading(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge?.challengeId) return;
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/balance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, code: form.get("code") }),
      });
      setBalance(await response.json() as Balance);
    } catch {
      setBalance({ balance: 0, history: [], error: "Não foi possível conectar." });
    } finally {
      setLoading(false);
    }
  }

  if (!challenge?.challengeId) {
    return (
      <form className="stack" onSubmit={start}>
        <p className="compact-note">Informe seu WhatsApp para encontrar todos os cartões vinculados.</p>
        <label>WhatsApp <MaskedDocumentInput name="phone" type="phone" autoComplete="tel" required /></label>
        <button disabled={loading}>{loading ? "Enviando…" : "Enviar código"}</button>
        {challenge?.error && <p className="message error" role="alert">{challenge.error}</p>}
      </form>
    );
  }

  if (balance && !balance.error) {
    return (
      <div className="stack" role="status">
        <p>Seus cartões:</p>
        {(balance.cards ?? []).map((card) => { const progress = Math.min(100, Math.round((card.balance / Math.max(card.rewardThreshold, 1)) * 100)); const key = `${card.merchantName}-${card.campaignName}`; const expanded = expandedCard === key; return <article className={`balance-card ${expanded ? "loyalty-pass expanded" : ""}`} key={key} onClick={() => setExpandedCard(expanded ? null : key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpandedCard(expanded ? null : key); }} role="button" tabIndex={0} aria-expanded={expanded}><div className="balance-card-heading"><div><strong>{card.merchantName}</strong><span>{card.campaignName}</span></div><b>{progress}%</b></div>{expanded ? <><div><p>{card.campaignName}</p><strong>{card.balance} de {card.rewardThreshold}</strong><small>{progress === 100 ? "Recompensa liberada" : "pontos para o próximo mimo"}</small></div><div className="stamp-grid" aria-label={`${progress}% concluído`}>{Array.from({ length: Math.min(card.rewardThreshold, 10) }, (_, index) => <span className={index < Math.min(card.balance, 10) ? "stamped" : ""} key={index}>{index < Math.min(card.balance, 10) && <Check size={15} strokeWidth={3} />}</span>)}</div><footer><span>PRÓXIMA RECOMPENSA</span><strong>{card.rewardTitle}</strong></footer></> : <><div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso em ${card.merchantName}`}><span style={{ width: `${progress}%` }} /></div><div className="reward-teaser"><span>Próxima recompensa</span><strong>{card.rewardTitle}</strong></div></>}<div className="balance-card-meta"><strong>{card.balance} ponto(s)</strong><span>{expanded ? "Toque para recolher" : "Toque para ver o cartão"}</span></div></article>; })}
        {balance.history.length > 0 && (
          <div>
            <strong>Últimas movimentações</strong>
            <ul className="history-list">{balance.history.map((item, index) => (
              <li key={`${item.createdAt}-${index}`}><span>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span><strong className={item.pointsDelta >= 0 ? "points-positive" : "points-negative"}>{item.pointsDelta > 0 ? "+" : ""}{item.pointsDelta} ponto(s)</strong></li>
            ))}</ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={verify}>
      <p className="message">Enviamos um código de verificação.</p>
      {challenge.devCode && <p className="message"><strong>Ambiente local:</strong> use o código {challenge.devCode}</p>}
      <label>Código de 6 dígitos <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required /></label>
      <button disabled={loading}>{loading ? "Verificando…" : "Ver saldo"}</button>
      {balance?.error && <p className="message error" role="alert">{balance.error}</p>}
    </form>
  );
}
