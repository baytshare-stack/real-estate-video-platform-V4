import prisma from "@/lib/prisma";

function todayUtcBucket() {
  return new Date().toISOString().slice(0, 10);
}

export function dailyCapPerAd(): number {
  const n = Number(process.env.AD_VIEWER_DAILY_CAP_PER_AD ?? "4");
  return Number.isFinite(n) && n > 0 ? Math.min(50, Math.floor(n)) : 4;
}

export function minSecondsBetweenSameAd(): number {
  const n = Number(process.env.AD_VIEWER_MIN_GAP_SEC ?? "90");
  return Number.isFinite(n) && n >= 0 ? Math.min(600, Math.floor(n)) : 90;
}

/** Returns adIds this viewer should not see again yet (daily cap or min gap). */
export async function getViewerAdExclusions(viewerKey: string | null | undefined): Promise<Set<string>> {
  const out = new Set<string>();
  const key = (viewerKey || "").trim().slice(0, 160);
  if (!key) return out;

  const cap = dailyCapPerAd();
  const gapMs = minSecondsBetweenSameAd() * 1000;
  const now = Date.now();
  const day = todayUtcBucket();

  const rows = await prisma.adViewerFrequency.findMany({
    where: { viewerKey: key },
    select: { adId: true, showsToday: true, dayBucket: true, lastShownAt: true },
  });

  for (const r of rows) {
    const count = r.dayBucket === day ? r.showsToday : 0;
    if (count >= cap) out.add(r.adId);
    if (gapMs > 0 && now - r.lastShownAt.getTime() < gapMs) out.add(r.adId);
  }
  return out;
}

export async function bumpViewerAdFrequency(viewerKey: string | null | undefined, adId: string) {
  const key = (viewerKey || "").trim().slice(0, 160);
  if (!key || adId.startsWith("mock-")) return;

  const day = todayUtcBucket();
  const row = await prisma.adViewerFrequency.findUnique({
    where: { viewerKey_adId: { viewerKey: key, adId } },
  });

  if (!row) {
    await prisma.adViewerFrequency.create({
      data: { viewerKey: key, adId, dayBucket: day, showsToday: 1, lastShownAt: new Date() },
    });
    return;
  }

  if (row.dayBucket !== day) {
    await prisma.adViewerFrequency.update({
      where: { id: row.id },
      data: { dayBucket: day, showsToday: 1, lastShownAt: new Date() },
    });
  } else {
    await prisma.adViewerFrequency.update({
      where: { id: row.id },
      data: { showsToday: { increment: 1 }, lastShownAt: new Date() },
    });
  }
}
