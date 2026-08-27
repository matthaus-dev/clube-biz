"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePlus } from "lucide-react";
import { MaskedDocumentInput } from "@/components/masked-document-input";

export function ManualCreditForm() {
  const router = useRouter();
  const key = useRef(crypto.randomUUID());
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/merchant/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        phone: form.get("phone"), cpf: form.get("cpf") || undefined,
        points: Number(form.get("points")), reason: form.get("reason"), idempotencyKey: key.current,
      }) });
      const payload = await response.json() as { error?: string; balance?: number; pointsAdded?: number };
      if (!response.ok) return setMessage({ text: payload.error ?? "Não foi possível registrar.", error: true });
      setMessage({ text: `${payload.pointsAdded} ponto(s) adicionados. Novo saldo: ${payload.balance}.` });
      key.current = crypto.randomUUID(); formElement.reset(); router.refresh();
    } catch { setMessage({ text: "Não foi possível conectar.", error: true }); }
    finally { setLoading(false); }
  }
  return <form className="stack form-card" onSubmit={submit}>
    <div><p className="eyebrow">Novo lançamento</p><h2>Dados da compra</h2><p className="compact-note">O cliente é criado automaticamente caso ainda não participe do clube.</p></div>
    <label>Celular <MaskedDocumentInput name="phone" type="phone" required /></label>
    <label>CPF <span className="muted">(opcional)</span><MaskedDocumentInput name="cpf" /></label>
    <label>Pontos <input name="points" type="number" min="1" defaultValue="1" required /></label>
    <label>Motivo <input name="reason" placeholder="Compra no balcão" minLength={3} maxLength={120} required /></label>
    <button disabled={loading}><BadgePlus size={18} />{loading ? "Registrando…" : "Registrar pontos"}</button>
    {message && <p className={`message ${message.error ? "error" : ""}`} role="status">{message.text}</p>}
  </form>;
}
