import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function recordAdImpressionMetrics(adId: string) {
  await prisma.adPerformance.upsert({
    where: { adId },
    create: { adId, impressions: 1 },
    update: { impressions: { increment: 1 } },
  });
}

export async function recordAdViewMetrics(adId: string, watchSeconds?: number) {
  const wt = typeof watchSeconds === "number" && watchSeconds > 0 ? Math.round(watchSeconds) : 0;
  await prisma.adPerformance.upsert({
    where: { adId },
    create: { adId, views: 1, watchTime: wt },
    update: {
      views: { increment: 1 },
      ...(wt ? { watchTime: { increment: wt } } : {}),
    },
  });
}

export async function recordAdClickMetrics(adId: string) {
  await prisma.adPerformance.upsert({
    where: { adId },
    create: { adId, clicks: 1 },
    update: { clicks: { increment: 1 } },
  });
}

export async function recordAdLeadMetrics(adId: string) {
  await prisma.adPerformance.upsert({
    where: { adId },
    create: { adId, leads: 1 },
    update: { leads: { increment: 1 } },
  });
}

export async function recordAdSpendMetrics(adId: string, amount: Prisma.Decimal) {
  if (amount.lte(0)) return;
  await prisma.adPerformance.upsert({
    where: { adId },
    create: { adId, spend: amount },
    update: { spend: { increment: amount } },
  });
}
