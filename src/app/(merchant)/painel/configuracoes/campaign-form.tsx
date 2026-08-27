"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

type Initial = { campaignId: string; name: string; status: "ACTIVE" | "PAUSED"; pointsPerClaim: number; rewardTitle: string; rewardThreshold: number; claimCooldownHours: number; dailyClaimLimit: number; rewardId?: string; rewardName: string; rewardPointsCost: number };

export function CampaignForm({ initial }: { initial: Initial }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/merchant/campaign", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      campaignId: initial.campaignId, rewardId: initial.rewardId,
      name: form.get("name"), status: form.get("status"), pointsPerClaim: Number(form.get("pointsPerClaim")),
      rewardTitle: form.get("rewardTitle"), rewardThreshold: Number(form.get("rewardThreshold")),
      claimCooldownHours: Number(form.get("claimCooldownHours")), dailyClaimLimit: Number(form.get("dailyClaimLimit")),
      rewardName: form.get("rewardName"), rewardPointsCost: Number(form.get("rewardPointsCost")),
    }) });
    const payload = await response.json() as { error?: string }; setMessage(response.ok ? "Configurações salvas." : payload.error ?? "Não foi possível salvar."); if (response.ok) router.refresh(); setLoading(false);
  }
  return <form className="stack form-card" onSubmit={submit}>
    <div><p className="eyebrow">Experiência do cliente</p><h2>Regras da campanha</h2></div>
    <label>Nome público <input name="name" defaultValue={initial.name} required /></label>
    <label>Status <select name="status" defaultValue={initial.status}><option value="ACTIVE">Ativa</option><option value="PAUSED">Pausada</option></select></label>
    <div className="form-grid"><label>Pontos por leitura <input name="pointsPerClaim" type="number" min="1" max="100" defaultValue={initial.pointsPerClaim} required /></label><label>Intervalo em horas <input name="claimCooldownHours" type="number" min="0" max="720" defaultValue={initial.claimCooldownHours} required /></label><label>Limite diário <input name="dailyClaimLimit" type="number" min="1" max="100" defaultValue={initial.dailyClaimLimit} required /></label></div>
    <label>Texto da recompensa <input name="rewardTitle" defaultValue={initial.rewardTitle} required /></label>
    <label>Meta exibida <input name="rewardThreshold" type="number" min="2" max="12" step="2" defaultValue={initial.rewardThreshold} required /><span className="compact-note">2, 4, 6, 8, 10 ou 12 pontos.</span></label>
    <hr /><div><p className="eyebrow">Benefício</p><h2>Recompensa ativa</h2></div><label>Nome <input name="rewardName" defaultValue={initial.rewardName} required /></label><label>Custo em pontos <input name="rewardPointsCost" type="number" min="1" defaultValue={initial.rewardPointsCost} required /></label>
    <button disabled={loading}><Save size={18} />{loading ? "Salvando…" : "Salvar configurações"}</button>{message && <p className="message" role="status">{message}</p>}
  </form>;
}
