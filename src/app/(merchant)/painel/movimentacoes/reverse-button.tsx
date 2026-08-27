"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReverseButton({ transactionId }: { transactionId: string }) {
  const router = useRouter(); const [loading, setLoading] = useState(false);
  return <button className="link-button" disabled={loading} onClick={async () => {
    const reason = window.prompt("Motivo do estorno:");
    if (!reason) return;
    setLoading(true);
    const response = await fetch("/api/merchant/points/reverse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactionId, reason, idempotencyKey: crypto.randomUUID() }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) window.alert(payload.error ?? "Não foi possível estornar.");
    router.refresh(); setLoading(false);
  }}>{loading ? "Estornando…" : "Estornar"}</button>;
}
