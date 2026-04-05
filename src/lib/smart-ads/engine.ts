import type { Ad, PlatformAdPosition, PrismaClient } from "@prisma/client";
import { passesTargetingFilter, categoryMatches, locationMatches } from "@/lib/smart-ads/normalize";
import { buildVideoAdMatchContext, type VideoAdMatchContext } from "@/lib/smart-ads/video-context";

export type SmartAdSelectionBySlot = Record<PlatformAdPosition, Ad | null>;

function medianInt(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : Math.floor((s[mid - 1]! + s[mid]!) / 2);
}

function scoreCandidate(
  ad: Pick<Ad, "targetCategory" | "targetLocation" | "priority" | "impressions">,
  ctx: VideoAdMatchContext,
  medianImpressions: number
): number {
  let score = ad.priority;
  const tc = ad.targetCategory.trim();
  const tl = ad.targetLocation.trim();
  if (tc && ctx.categoryNorm && categoryMatches(tc, ctx.categoryNorm)) score += 5;
  if (tl && ctx.locationNorm && locationMatches(tl, ctx.locationNorm)) score += 3;
  if (ad.impressions < medianImpressions) score += 1;
  return score;
}

function pickBestForPosition(candidates: Ad[], ctx: VideoAdMatchContext): Ad | null {
  if (!candidates.length) return null;
  const med = medianInt(candidates.map((c) => c.impressions));
  let best: Ad | null = null;
  let bestScore = -Infinity;
  for (const ad of candidates) {
    const sc = scoreCandidate(ad, ctx, med);
    if (sc > bestScore) {
      bestScore = sc;
      best = ad;
      continue;
    }
    if (sc === bestScore && best) {
      if (ad.impressions < best.impressions) {
        best = ad;
        continue;
      }
      if (ad.impressions === best.impressions && ad.createdAt < best.createdAt) {
        best = ad;
      }
    }
  }
  return best;
}

/**
 * Core matcher: filters active inventory by targeting rules, scores, and returns the top ad per slot.
 */
export function selectBestAdsForVideoContext(ads: Ad[], ctx: VideoAdMatchContext): SmartAdSelectionBySlot {
  const slots: PlatformAdPosition[] = ["PRE_ROLL", "MID_ROLL", "OVERLAY"];
  const result = {
    PRE_ROLL: null,
    MID_ROLL: null,
    OVERLAY: null,
  } as SmartAdSelectionBySlot;

  const filtered = ads.filter((a) =>
    passesTargetingFilter({
      targetCategory: a.targetCategory,
      targetLocation: a.targetLocation,
      videoCategoryNorm: ctx.categoryNorm,
      videoLocationNorm: ctx.locationNorm,
    })
  );

  for (const slot of slots) {
    const bucket = filtered.filter((a) => a.position === slot);
    result[slot] = pickBestForPosition(bucket, ctx);
  }

  return result;
}

export async function loadActiveSmartAds(prisma: PrismaClient): Promise<Ad[]> {
  return prisma.ad.findMany({
    where: { isActive: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Loads the video row, resolves match context, fetches inventory, and returns best ad per slot.
 * `userId` is reserved for future personalization; context is data-driven today.
 */
export async function getBestAdsForVideo(
  prisma: PrismaClient,
  videoId: string,
  _userId?: string | null
): Promise<{ context: VideoAdMatchContext | null; selection: SmartAdSelectionBySlot; inventory: Ad[] }> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { property: { select: { city: true, country: true } } },
  });

  if (!video) {
    return { context: null, selection: { PRE_ROLL: null, MID_ROLL: null, OVERLAY: null }, inventory: [] };
  }

  const context = buildVideoAdMatchContext(video);
  const inventory = await loadActiveSmartAds(prisma);
  const selection = selectBestAdsForVideoContext(inventory, context);

  return { context, selection, inventory };
}
