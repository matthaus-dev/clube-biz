import { notFound } from "next/navigation";
import { can } from "@/modules/auth/domain/permissions";
import { requireSession } from "@/modules/auth/infrastructure/session";
import { getMerchantCampaign } from "@/modules/merchants/application/dashboard-queries";
import { CampaignForm } from "./campaign-form";
import { SlidersHorizontal } from "lucide-react";

export default async function SettingsPage() {
  const session = await requireSession(); if (!can(session.role, "campaign:update")) notFound();
  const campaign = await getMerchantCampaign(session.merchantId); if (!campaign) notFound(); const reward = campaign.rewards[0];
  return <div className="dashboard-stack"><header className="page-title"><div className="page-title-copy"><p className="eyebrow">Campanha</p><h1>Configurações</h1><p className="dashboard-subtitle">Alterações valem somente para operações futuras.</p></div><span className="page-title-icon"><SlidersHorizontal size={23} /></span></header><CampaignForm initial={{ campaignId: campaign.id, name: campaign.name, status: campaign.status as "ACTIVE" | "PAUSED", pointsPerClaim: campaign.pointsPerClaim, rewardTitle: campaign.rewardTitle, rewardThreshold: campaign.rewardThreshold, claimCooldownHours: campaign.claimCooldownHours, dailyClaimLimit: campaign.dailyClaimLimit, rewardId: reward?.id, rewardName: reward?.name ?? campaign.rewardTitle, rewardPointsCost: reward?.pointsCost ?? campaign.rewardThreshold }} /></div>;
}
