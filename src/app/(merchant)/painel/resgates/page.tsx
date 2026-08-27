import { prisma } from "@/lib/db/prisma";
import { can } from "@/modules/auth/domain/permissions";
import { requireSession } from "@/modules/auth/infrastructure/session";
import { listMerchantCustomers, getMerchantCampaign } from "@/modules/merchants/application/dashboard-queries";
import { RedemptionPanel } from "./redemption-panel";
import { Gift, Search } from "lucide-react";

export default async function RedemptionsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const [campaign, customersData, redemptions] = await Promise.all([
    getMerchantCampaign(session.merchantId), listMerchantCustomers(session.merchantId, { take: 50, search: params.q }),
    prisma.redemption.findMany({ where: { merchantId: session.merchantId }, orderBy: { createdAt: "desc" }, take: 30, include: { reward: true } }),
  ]);
  return <div className="dashboard-stack"><header className="page-title"><div className="page-title-copy"><p className="eyebrow">Recompensas</p><h1>Resgates</h1><p className="dashboard-subtitle">O custo é lido da recompensa configurada e debitado em uma única transação.</p></div><span className="page-title-icon"><Gift size={23} /></span></header>
    <form className="filter-bar"><input name="q" defaultValue={params.q} placeholder="Localizar por telefone ou CPF" aria-label="Telefone ou CPF" /><button><Search size={17} /> Localizar cliente</button></form>
    <RedemptionPanel customers={customersData.customers.map((item) => ({ id: item.id, label: item.phoneMasked, balance: item.balance }))} rewards={(campaign?.rewards ?? []).filter((item) => item.status === "ACTIVE").map((item) => ({ id: item.id, name: item.name, pointsCost: item.pointsCost }))} redemptions={redemptions.map((item) => ({ id: item.id, rewardName: item.reward.name, pointsSpent: item.pointsSpent, status: item.status, createdAt: item.createdAt.toISOString() }))} canCancel={can(session.role, "redemptions:cancel")} />
  </div>;
}
