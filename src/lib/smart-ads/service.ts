import type { PrismaClient } from "@prisma/client";
import { getBestAdsForVideo, type SmartAdSelectionBySlot } from "@/lib/smart-ads/engine";

/**
 * Smart Ads Engine entry point. Resolves the best **active** creative **per slot**
 * (pre-roll, mid-roll, overlay) for the given listing video and optional viewer.
 */
export async function getBestAdForVideo(
  prisma: PrismaClient,
  videoId: string,
  userId?: string | null
): Promise<SmartAdSelectionBySlot> {
  const { selection } = await getBestAdsForVideo(prisma, videoId, userId);
  return selection;
}
