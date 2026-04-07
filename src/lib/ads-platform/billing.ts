import prisma from "@/lib/prisma";

const VIEW_COST = 0.02;
const LEAD_COST = 3;

export async function chargeForView(campaignId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaignId },
      data: { spent: { increment: VIEW_COST } },
    });
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
      select: { advertiserId: true },
    });
    if (campaign) {
      await tx.advertiserProfile.update({
        where: { id: campaign.advertiserId },
        data: { balance: { decrement: VIEW_COST } },
      });
    }
  });
}

export async function chargeForLead(campaignId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaignId },
      data: { spent: { increment: LEAD_COST } },
    });
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
      select: { advertiserId: true },
    });
    if (campaign) {
      await tx.advertiserProfile.update({
        where: { id: campaign.advertiserId },
        data: { balance: { decrement: LEAD_COST } },
      });
    }
  });
}

