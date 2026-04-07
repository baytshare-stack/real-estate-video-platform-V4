import { CampaignStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type VideoContext = {
  videoId: string;
  country?: string | null;
  city?: string | null;
  area?: string | null;
  propertyType?: string | null;
  price?: number | null;
};

type TargetingSlice = {
  country: string;
  city: string;
  area: string;
  propertyTypes: string[];
  priceMin: Prisma.Decimal | null;
  priceMax: Prisma.Decimal | null;
};

type Candidate = {
  id: string;
  createdAt: Date;
  campaignId: string;
  type: "VIDEO" | "IMAGE";
  videoUrl: string | null;
  imageUrl: string | null;
  thumbnail: string | null;
  duration: number;
  skipAfter: number;
  ctaType: "CALL" | "WHATSAPP" | "BOOK_VISIT";
  ctaLabel: string | null;
  ctaUrl: string | null;
  placement: "PRE_ROLL" | "MID_ROLL";
  campaign: {
    budget: Prisma.Decimal;
    dailyBudget: Prisma.Decimal;
    spent: Prisma.Decimal;
    bidWeight: number;
    startDate: Date;
    endDate: Date;
    status: CampaignStatus;
  };
  targeting: TargetingSlice | null;
};

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function adsDebugEnabled() {
  return process.env.ADS_DEBUG === "1" || process.env.NODE_ENV === "development";
}

function logDebug(...args: unknown[]) {
  if (adsDebugEnabled()) console.log("[ads-targeting]", ...args);
}

function inRange(price: number | null | undefined, min: Prisma.Decimal | null, max: Prisma.Decimal | null) {
  if (price == null || Number.isNaN(price)) return false;
  if (min != null && price < Number(min)) return false;
  if (max != null && price > Number(max)) return false;
  return true;
}

/** Ad must specify all three; empty = ineligible (no global delivery). */
function adTargetingComplete(t: TargetingSlice | null): t is TargetingSlice {
  if (!t) return false;
  return Boolean(normalize(t.country) && normalize(t.city) && normalize(t.area));
}

function optionalPropertyMatches(t: TargetingSlice, ctx: VideoContext): boolean {
  if (!t.propertyTypes.length) return true;
  const pt = normalize(ctx.propertyType);
  if (!pt) return false;
  return t.propertyTypes.some((p) => normalize(p) === pt);
}

function optionalPriceMatches(t: TargetingSlice, ctx: VideoContext): boolean {
  const hasBounds = t.priceMin != null || t.priceMax != null;
  if (!hasBounds) return true;
  return inRange(ctx.price, t.priceMin, t.priceMax);
}

function matchesStrictLocation(t: TargetingSlice, ctx: VideoContext): boolean {
  return (
    normalize(t.country) === normalize(ctx.country) &&
    normalize(t.city) === normalize(ctx.city) &&
    normalize(t.area) === normalize(ctx.area)
  );
}

/** Fallback when no strict area match: same country + city only. */
function matchesCityFallbackLocation(t: TargetingSlice, ctx: VideoContext): boolean {
  return normalize(t.country) === normalize(ctx.country) && normalize(t.city) === normalize(ctx.city);
}

function budgetAllowed(ad: Candidate) {
  const spent = Number(ad.campaign.spent);
  const totalBudget = Number(ad.campaign.budget);
  return spent < totalBudget;
}

type MatchMode = "strict" | "city_fallback";

function evaluateAd(
  ad: Candidate,
  ctx: VideoContext,
  mode: MatchMode
): { ok: boolean; reason: string } {
  const t = ad.targeting;

  if (!adTargetingComplete(t)) {
    return { ok: false, reason: "rejected: incomplete ad targeting (need non-empty country, city, area)" };
  }

  const locOk = mode === "strict" ? matchesStrictLocation(t, ctx) : matchesCityFallbackLocation(t, ctx);
  if (!locOk) {
    if (mode === "strict") {
      return {
        ok: false,
        reason: `rejected: strict location mismatch (ad ${JSON.stringify({ country: t.country, city: t.city, area: t.area })} vs video ${JSON.stringify({ country: ctx.country, city: ctx.city, area: ctx.area })})`,
      };
    }
    return {
      ok: false,
      reason: `rejected: city fallback location mismatch (ad ${JSON.stringify({ country: t.country, city: t.city })} vs video ${JSON.stringify({ country: ctx.country, city: ctx.city })})`,
    };
  }

  if (!optionalPropertyMatches(t, ctx)) {
    return { ok: false, reason: "rejected: propertyType constraint not satisfied" };
  }
  if (!optionalPriceMatches(t, ctx)) {
    return { ok: false, reason: "rejected: price outside ad range or video price missing" };
  }

  return {
    ok: true,
    reason: `accepted: ${mode === "strict" ? "strict area match" : "city-level fallback"} + optional filters OK`,
  };
}

function pickFromPool(
  candidates: Candidate[],
  ctx: VideoContext,
  mode: MatchMode
): { ad: Candidate; relevance: number } | null {
  const eligible = candidates
    .filter(budgetAllowed)
    .map((ad) => {
      const { ok, reason } = evaluateAd(ad, ctx, mode);
      logDebug("ad", ad.id, "| target", ad.targeting, "|", reason);
      return ok ? ad : null;
    })
    .filter(Boolean) as Candidate[];

  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    const w = b.campaign.bidWeight - a.campaign.bidWeight;
    if (w !== 0) return w;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const top = eligible[0]!;
  const relevance = mode === "strict" ? 1 : 0.85;
  return { ad: top, relevance };
}

export async function pickBestAdForSlot(ctx: VideoContext, slot: "PRE_ROLL" | "MID_ROLL") {
  const now = new Date();
  logDebug("video location / listing", {
    videoId: ctx.videoId,
    country: ctx.country,
    city: ctx.city,
    area: ctx.area,
    propertyType: ctx.propertyType,
    price: ctx.price,
  });

  const candidates = (await prisma.ad.findMany({
    where: {
      placement: slot,
      status: "ACTIVE",
      campaign: {
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
    include: {
      campaign: {
        select: {
          budget: true,
          dailyBudget: true,
          spent: true,
          bidWeight: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
      targeting: {
        select: {
          country: true,
          city: true,
          area: true,
          propertyTypes: true,
          priceMin: true,
          priceMax: true,
        },
      },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  })) as Candidate[];

  const strict = pickFromPool(candidates, ctx, "strict");
  if (strict) {
    logDebug("picked", strict.ad.id, "mode=strict", "bidWeight=", strict.ad.campaign.bidWeight);
    return {
      ad: strict.ad,
      relevance: strict.relevance,
      score: strict.ad.campaign.bidWeight + strict.relevance,
    };
  }

  logDebug("no strict matches; trying city-level fallback");
  const fallback = pickFromPool(candidates, ctx, "city_fallback");
  if (fallback) {
    logDebug("picked", fallback.ad.id, "mode=city_fallback", "bidWeight=", fallback.ad.campaign.bidWeight);
    return {
      ad: fallback.ad,
      relevance: fallback.relevance,
      score: fallback.ad.campaign.bidWeight + fallback.relevance,
    };
  }

  logDebug("no ad served for slot", slot);
  return null;
}

export async function buildVideoContext(videoId: string): Promise<VideoContext | null> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { property: true },
  });
  if (!video) return null;

  const prop = video.property;
  const areaFromListing = normalize(prop?.area) || normalize(prop?.address) || "";

  return {
    videoId,
    country: prop?.country || null,
    city: prop?.city || null,
    area: areaFromListing || null,
    propertyType: prop?.propertyType || video.category || null,
    price: prop?.price ? Number(prop.price) : null,
  };
}
