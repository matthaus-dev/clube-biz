import { notFound } from "next/navigation";
import { getPublicQr } from "@/modules/qr-codes/application/get-public-qr";
import { ClaimForm } from "./claim-form";
import { TicketCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const qr = await getPublicQr(token);
  if (!qr) notFound();

  return (
    <main className="page customer-page" id="conteudo">
      <section className="card public-card">
        <div className="brand-lockup"><span className="brand-mark"><TicketCheck size={18} /></span><span className="brand-name">{qr.merchant.name}</span></div>
        <ClaimForm token={token} card={{ merchantName: qr.merchant.name, campaignName: qr.campaign.name, rewardTitle: qr.campaign.rewardTitle, rewardThreshold: qr.campaign.rewardThreshold }} />
      </section>
    </main>
  );
}
