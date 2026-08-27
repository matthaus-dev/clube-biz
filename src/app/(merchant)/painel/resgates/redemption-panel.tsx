"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, History } from "lucide-react";

type Customer = { id: string; label: string; balance: number };
type Reward = { id: string; name: string; pointsCost: number };
type Redemption = { id: string; rewardName: string; pointsSpent: number; status: string; createdAt: string };

export function RedemptionPanel({ customers, rewards, redemptions, canCancel }: { customers: Customer[]; rewards: Reward[]; redemptions: Redemption[]; canCancel: boolean }) {
  const router = useRouter(); const key = useRef(crypto.randomUUID()); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/merchant/redemptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membershipId: form.get("membershipId"), rewardId: form.get("rewardId"), idempotencyKey: key.current }) });
    const payload = await response.json() as { error?: string; pointsSpent?: number };
    setMessage(response.ok ? `Resgate confirmado: ${payload.pointsSpent} ponto(s).` : payload.error ?? "Não foi possível resgatar.");
    if (response.ok) { key.current = crypto.randomUUID(); router.refresh(); } setLoading(false);
  }
  async function cancel(id: string) {
    const reason = window.prompt("Motivo do cancelamento:"); if (!reason) return;
    const response = await fetch(`/api/merchant/redemptions/${id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, idempotencyKey: crypto.randomUUID() }) });
    const payload = await response.json() as { error?: string }; if (!response.ok) window.alert(payload.error ?? "Não foi possível cancelar."); router.refresh();
  }
  return <div className="dashboard-stack"><form className="stack form-card" onSubmit={submit}>
    <div><p className="eyebrow">Novo resgate</p><h2>Confirmar benefício</h2></div>
    <label>Cliente <select name="membershipId" required><option value="">Selecione</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.label} — saldo {item.balance}</option>)}</select></label>
    <label>Recompensa <select name="rewardId" required><option value="">Selecione</option>{rewards.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.pointsCost} pontos</option>)}</select></label>
    <button disabled={loading || !customers.length || !rewards.length}><Gift size={18} />{loading ? "Confirmando…" : "Confirmar resgate"}</button>{message && <p className="message" role="status">{message}</p>}
  </form><section className="panel"><div className="panel-header"><h2 className="section-heading"><History size={19} /> Resgates recentes</h2></div>{redemptions.length === 0 ? <div className="empty-state"><span className="empty-state-icon"><Gift size={22} /></span><p>Nenhum resgate.</p></div> : <div className="table-wrap"><table className="responsive-table"><thead><tr><th>Data</th><th>Recompensa</th><th>Pontos</th><th>Status</th><th></th></tr></thead><tbody>{redemptions.map((item) => <tr key={item.id}><td data-label="Data">{new Date(item.createdAt).toLocaleString("pt-BR")}</td><td data-label="Recompensa">{item.rewardName}</td><td data-label="Pontos">{item.pointsSpent}</td><td data-label="Status"><span className="status-pill">{item.status}</span></td><td className="table-action">{canCancel && item.status === "CONFIRMED" && <button className="link-button" onClick={() => cancel(item.id)}>Cancelar</button>}</td></tr>)}</tbody></table></div>}</section></div>;
}
