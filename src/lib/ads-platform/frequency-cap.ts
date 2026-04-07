import prisma from "@/lib/prisma";

export const AD_FREQ_CAP_PER_DAY = 3;

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function getViewerDayImpressionCounts(
  viewerKey: string,
  adIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!viewerKey || !adIds.length) return map;
  const dayUtc = utcDayKey();
  const rows = await prisma.adViewerDayImpression.findMany({
    where: { viewerKey, dayUtc, adId: { in: adIds } },
    select: { adId: true, count: true },
  });
  for (const r of rows) map.set(r.adId, r.count);
  return map;
}

/** Called when a tracked impression fires (same moment as AdPerformance). */
export async function recordViewerAdDayImpression(viewerKey: string | null | undefined, adId: string) {
  if (!viewerKey?.trim()) return;
  const dayUtc = utcDayKey();
  await prisma.adViewerDayImpression.upsert({
    where: {
      viewerKey_adId_dayUtc: { viewerKey, adId, dayUtc },
    },
    create: { viewerKey, adId, dayUtc, count: 1 },
    update: { count: { increment: 1 } },
  });
}
