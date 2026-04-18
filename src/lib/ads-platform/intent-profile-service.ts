import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { WatchVideoContext } from "@/lib/video-ads/watch-context";

export type UserIntentProfileSlice = {
  preferredLocation: string | null;
  preferredPropertyType: string | null;
  budgetMin: Prisma.Decimal | null;
  budgetMax: Prisma.Decimal | null;
  engagementScore: number;
};

export async function loadUserIntentProfileSlice(userId: string | null | undefined): Promise<UserIntentProfileSlice | null> {
  if (!userId?.trim()) return null;
  const row = await prisma.userIntentProfile.findUnique({
    where: { userId },
    select: {
      preferredLocation: true,
      preferredPropertyType: true,
      budgetMin: true,
      budgetMax: true,
      engagementScore: true,
    },
  });
  if (!row) return null;
  return {
    preferredLocation: row.preferredLocation,
    preferredPropertyType: row.preferredPropertyType,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    engagementScore: row.engagementScore,
  };
}

/** Upsert profile from a watched listing video (organic signal). */
export async function recordWatchIntentFromVideo(userId: string, videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      propertyType: true,
      category: true,
      property: {
        select: {
          country: true,
          city: true,
          propertyType: true,
          price: true,
        },
      },
    },
  });
  if (!video) return;

  const city = video.property?.city?.trim();
  const country = video.property?.country?.trim();
  const loc =
    city && country ? `${city}, ${country}` : city || country || null;
  const pType = video.property?.propertyType
    ? String(video.property.propertyType)
    : video.propertyType
      ? String(video.propertyType)
      : video.category?.trim() || null;
  const price = video.property?.price ?? null;

  let budgetMin: Prisma.Decimal | null = null;
  let budgetMax: Prisma.Decimal | null = null;
  if (price != null) {
    budgetMin = price.mul(new Prisma.Decimal("0.85"));
    budgetMax = price.mul(new Prisma.Decimal("1.15"));
  }

  await prisma.userIntentProfile.upsert({
    where: { userId },
    create: {
      userId,
      preferredLocation: loc,
      preferredPropertyType: pType,
      budgetMin,
      budgetMax,
      engagementScore: 1,
      videosWatchedCount: 1,
    },
    update: {
      ...(loc ? { preferredLocation: loc } : {}),
      ...(pType ? { preferredPropertyType: pType } : {}),
      ...(budgetMin != null ? { budgetMin } : {}),
      ...(budgetMax != null ? { budgetMax } : {}),
      engagementScore: { increment: 0.25 },
      videosWatchedCount: { increment: 1 },
    },
  });
}

/** Extra 0–18 relevance points from learned viewer intent vs listing context. */
export function intentProfileBoost(ctx: WatchVideoContext, profile: UserIntentProfileSlice | null): number {
  if (!profile) return 0;
  let pts = 0;
  const loc = (profile.preferredLocation || "").trim().toUpperCase();
  if (loc) {
    const hay = `${ctx.city || ""}, ${ctx.country || ""}`.toUpperCase();
    if (hay.includes(loc.slice(0, Math.min(loc.length, 40))) || loc.includes((ctx.city || "").toUpperCase())) {
      pts += 8;
    }
  }
  const pt = (profile.preferredPropertyType || "").trim().toUpperCase();
  if (pt && ctx.propertyTypeKey && pt === ctx.propertyTypeKey.trim().toUpperCase()) {
    pts += 7;
  }
  if (profile.budgetMin != null && profile.budgetMax != null && ctx.price != null) {
    if (ctx.price.gte(profile.budgetMin) && ctx.price.lte(profile.budgetMax)) pts += 5;
  }
  return Math.min(18, pts + Math.min(3, profile.engagementScore * 0.15));
}
