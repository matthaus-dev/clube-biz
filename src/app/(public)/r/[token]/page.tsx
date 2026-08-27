import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicQr } from "@/modules/qr-codes/application/get-public-qr";
import { ClaimForm } from "./claim-form";
import { Gift, TicketCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const qr = await getPublicQr(token);
  if (!qr) notFound();

  return (
    <main className="page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">{qr.merchant.name}</span></div>
        <p className="eyebrow">{qr.campaign.name}</p>
        <h1>Sua compra vale pontos.</h1>
        <div className="reward-banner"><span className="reward-icon"><Gift size={22} /></span><span><small>Sua próxima recompensa</small><strong>{qr.campaign.rewardTitle}</strong><span>Ao completar {qr.campaign.rewardThreshold} pontos</span></span></div>
        <ClaimForm token={token} />
        <nav className="links"><Link href="/saldo">Já pontua aqui? Consulte seu saldo</Link></nav>
      </section>
    </main>
  );
}
