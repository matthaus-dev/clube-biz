import type { PrismaClient } from "@prisma/client";
import type { MerchantSession } from "@/modules/auth/infrastructure/session";
import { assertPermission } from "@/modules/auth/domain/permissions";
import { withSerializableRetry } from "@/lib/db/transaction";

export type UpdateCampaignInput = {
  campaignId: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  pointsPerClaim: number;
  rewardTitle: string;
  rewardThreshold: number;
  claimCooldownHours: number;
  dailyClaimLimit: number;
  rewardId?: string;
  rewardName: string;
  rewardPointsCost: number;
  requestId: string;
};

export async function updateCampaignSettings(
  prisma: PrismaClient,
  session: MerchantSession,
  input: UpdateCampaignInput,
) {
  assertPermission(session.role, "campaign:update");
  assertPermission(session.role, "rewards:manage");
  return withSerializableRetry(prisma, async (tx) => {
    const campaign = await tx.campaign.findFirst({
      where: { id: input.campaignId, merchantId: session.merchantId },
    });
    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

    const updated = await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        name: input.name,
        status: input.status,
        pointsPerClaim: input.pointsPerClaim,
        rewardTitle: input.rewardTitle,
        rewardThreshold: input.rewardThreshold,
        claimCooldownHours: input.claimCooldownHours,
        dailyClaimLimit: input.dailyClaimLimit,
      },
    });
    const reward = input.rewardId
      ? await tx.reward.update({
          where: { id: input.rewardId, campaignId: campaign.id },
          data: { name: input.rewardName, pointsCost: input.rewardPointsCost, status: "ACTIVE" },
        })
      : await tx.reward.create({
          data: {
            campaignId: campaign.id,
            name: input.rewardName,
            pointsCost: input.rewardPointsCost,
            status: "ACTIVE",
          },
        });
    await tx.auditLog.create({
      data: {
        merchantId: session.merchantId,
        actorMerchantUserId: session.userId,
        action: "CAMPAIGN_SETTINGS_UPDATED",
        entityType: "Campaign",
        entityId: campaign.id,
        metadata: {
          status: input.status,
          pointsPerClaim: input.pointsPerClaim,
          rewardId: reward.id,
          rewardPointsCost: input.rewardPointsCost,
        },
        requestId: input.requestId,
      },
    });
    return { campaign: updated, reward };
  });
}
