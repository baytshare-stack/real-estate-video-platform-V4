import { CampaignStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AD_FREQ_CAP_PER_DAY, getViewerDayImpressionCounts } from "@/lib/ads-platform/frequency-cap";
import { ADS_WALLET_IMPRESSION_COST, getAdvertiserDeliveryLiquidityMap } from "@/lib/ads-platform/billing";

const ZERO = new Prisma.Decimal(0);

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
    advertiser: { userId: string };
  };
  targeting: TargetingSlice | null;
  performance: { impressions: number; clicks: number } | null;
};

export type AdDeliveryOptions = {
  viewerKey?: string | null;
  lastServedAdIdForSlot?: string | null;
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

/** Remaining campaign budget must cover at least one impression charge. */
function campaignCanAffordNextImpression(ad: Candidate) {
  const rem = ad.campaign.budget.sub(ad.campaign.spent);
  return rem.gte(ADS_WALLET_IMPRESSION_COST);
}

/** Remaining total budget ratio (read-only); does not change spend logic. */
function remainingBudgetRatio(ad: Candidate): number {
  const total = ad.campaign.budget;
  const spent = ad.campaign.spent;
  if (total.lte(ZERO)) return 0;
  const ratio = total.sub(spent).div(total).toNumber();
  return Math.max(0, Math.min(1, ratio));
}

/**
 * CTR-smoothed weight + bid + budget headroom + rotation penalty for last served.
 * Low-CTR ads stay in the mix with a small floor (exploration) but lose to high CTR.
 */
function deliveryWeight(
  ad: Candidate,
  lastServedAdId: string | null | undefined
): number {
  const perf = ad.performance;
  const imp = Math.max(perf?.impressions ?? 0, 0);
  const clk = perf?.clicks ?? 0;
  const smoothedCtr = (clk + 0.5) / (imp + 10);
  const ctrFactor = 0.06 + Math.min(3.5, Math.pow(smoothedCtr + 0.01, 0.65) * 5);
  const bid = Math.max(0.05, ad.campaign.bidWeight);
  const budgetFactor = 0.1 + 0.9 * remainingBudgetRatio(ad);
  let w = bid * ctrFactor * budgetFactor;
  if (lastServedAdId && lastServedAdId === ad.id) w *= 0.12;
  return w;
}

function weightedRandomPick<T>(items: T[], weight: (t: T) => number): T {
  const w = items.map(weight);
  const sum = w.reduce((a, b) => a + b, 0);
  if (!(sum > 0) || !Number.isFinite(sum)) {
    return items[Math.floor(Math.random() * items.length)]!;
  }
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= w[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

type MatchMode = "strict" | "city_fallback" | "country_fallback" | "global";

function evaluateAd(
  ad: Candidate,
  ctx: VideoContext,
  mode: MatchMode
): { ok: boolean; reason: string } {
  const t = ad.targeting;
  if (!t) {
    return { ok: mode === "global", reason: mode === "global" ? "accepted: global ad" : "rejected: global ad only in global mode" };
  }

  // No targeting row OR completely empty location targeting => global ad.
  const isGlobal =
    !normalize(t.country) &&
      !normalize(t.city) &&
      !normalize(t.area) &&
      (!t.propertyTypes?.length || t.propertyTypes.length === 0) &&
      t.priceMin == null &&
      t.priceMax == null;
  if (isGlobal) {
    return { ok: mode === "global", reason: mode === "global" ? "accepted: global ad" : "rejected: global ad only in global mode" };
  }

  // Partially filled targeting behaves as relaxed fallback:
  // - if only country set -> country fallback
  // - if country+city set -> city fallback
  // - if full country+city+area set -> strict preferred
  const hasCountry = Boolean(normalize(t.country));
  const hasCity = Boolean(normalize(t.city));
  const hasArea = Boolean(normalize(t.area));
  const isCountryOnly = hasCountry && !hasCity && !hasArea;
  const isCityLevel = hasCountry && hasCity && !hasArea;

  if (!hasCountry) {
    return { ok: false, reason: "rejected: targeting missing country" };
  }

  const locOk =
    mode === "strict"
      ? hasCountry && hasCity && hasArea && matchesStrictLocation(t, ctx)
      : mode === "city_fallback"
        ? (isCityLevel || (hasCountry && hasCity && hasArea)) && matchesCityFallbackLocation(t, ctx)
        : mode === "country_fallback"
          ? normalize(t.country) === normalize(ctx.country)
          : false;
  if (!locOk) {
    if (mode === "strict" && !isCountryOnly && !isCityLevel) {
      return {
        ok: false,
        reason: `rejected: strict location mismatch (ad ${JSON.stringify({ country: t.country, city: t.city, area: t.area })} vs video ${JSON.stringify({ country: ctx.country, city: ctx.city, area: ctx.area })})`,
      };
    }
    if (mode === "strict" && (isCountryOnly || isCityLevel)) {
      return { ok: false, reason: "rejected: ad uses relaxed targeting; handled in fallback modes" };
    }
    return {
      ok: false,
      reason:
        mode === "city_fallback"
          ? `rejected: city fallback mismatch (ad ${JSON.stringify({ country: t.country, city: t.city })} vs video ${JSON.stringify({ country: ctx.country, city: ctx.city })})`
          : `rejected: country fallback mismatch (ad ${JSON.stringify({ country: t.country })} vs video ${JSON.stringify({ country: ctx.country })})`,
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
    reason:
      mode === "strict"
        ? "accepted: strict area match + optional filters OK"
        : mode === "city_fallback"
          ? "accepted: city-level fallback + optional filters OK"
          : "accepted: country-level fallback + optional filters OK",
  };
}

async function pickFromPool(
  candidates: Candidate[],
  ctx: VideoContext,
  mode: MatchMode,
  options?: AdDeliveryOptions
): Promise<{ ad: Candidate; relevance: number } | null> {
  let eligible = candidates
    .filter(campaignCanAffordNextImpression)
    .map((ad) => {
      const { ok, reason } = evaluateAd(ad, ctx, mode);
      logDebug("ad", ad.id, "| target", ad.targeting, "|", reason);
      return ok ? ad : null;
    })
    .filter(Boolean) as Candidate[];

  if (!eligible.length) return null;

  const advertiserUserIds = [...new Set(eligible.map((e) => e.campaign.advertiser.userId))];
  const liquidityByUser = await getAdvertiserDeliveryLiquidityMap(advertiserUserIds);
  eligible = eligible.filter((ad) => {
    const liq = liquidityByUser.get(ad.campaign.advertiser.userId);
    return liq != null && liq.gt(ZERO);
  });

  if (!eligible.length) return null;

  const vk = options?.viewerKey?.trim();
  if (vk) {
    const cap = await getViewerDayImpressionCounts(vk, eligible.map((e) => e.id));
    eligible = eligible.filter((ad) => (cap.get(ad.id) ?? 0) < AD_FREQ_CAP_PER_DAY);
  }

  if (!eligible.length) return null;

  const last = options?.lastServedAdIdForSlot ?? null;
  const picked = weightedRandomPick(eligible, (ad) => deliveryWeight(ad, last));
  const relevance = mode === "strict" ? 1 : 0.85;
  return { ad: picked, relevance };
}

export async function pickBestAdForSlot(
  ctx: VideoContext,
  slot: "PRE_ROLL" | "MID_ROLL",
  options?: AdDeliveryOptions
) {
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
          advertiser: { select: { userId: true } },
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
      performance: {
        select: { impressions: true, clicks: true },
      },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  })) as Candidate[];

  const mediaValid = (ad: Candidate) =>
    ad.type === "VIDEO" ? Boolean(ad.videoUrl?.trim()) : Boolean(ad.imageUrl?.trim());
  const withMedia = candidates.filter(mediaValid);
  if (withMedia.length !== candidates.length) {
    logDebug("filtered missing media", {
      slot,
      total: candidates.length,
      missingMedia: candidates.length - withMedia.length,
    });
  }

  const strict = await pickFromPool(withMedia, ctx, "strict", options);
  if (strict) {
    logDebug("picked", strict.ad.id, "mode=strict", "bidWeight=", strict.ad.campaign.bidWeight);
    return {
      ad: strict.ad,
      relevance: strict.relevance,
      score: strict.ad.campaign.bidWeight + strict.relevance,
    };
  }

  logDebug("no strict matches; trying city-level fallback");
  const cityFallback = await pickFromPool(withMedia, ctx, "city_fallback", options);
  if (cityFallback) {
    logDebug("picked", cityFallback.ad.id, "mode=city_fallback", "bidWeight=", cityFallback.ad.campaign.bidWeight);
    return {
      ad: cityFallback.ad,
      relevance: cityFallback.relevance,
      score: cityFallback.ad.campaign.bidWeight + cityFallback.relevance,
    };
  }

  logDebug("no city fallback; trying country-level fallback");
  const countryFallback = await pickFromPool(withMedia, ctx, "country_fallback", options);
  if (countryFallback) {
    logDebug("picked", countryFallback.ad.id, "mode=country_fallback", "bidWeight=", countryFallback.ad.campaign.bidWeight);
    return {
      ad: countryFallback.ad,
      relevance: 0.7,
      score: countryFallback.ad.campaign.bidWeight + 0.7,
    };
  }

  logDebug("no country fallback; trying global ads");
  const globalPick = await pickFromPool(withMedia, ctx, "global", options);
  if (globalPick) {
    logDebug("picked", globalPick.ad.id, "mode=global", "bidWeight=", globalPick.ad.campaign.bidWeight);
    return {
      ad: globalPick.ad,
      relevance: 0.55,
      score: globalPick.ad.campaign.bidWeight + 0.55,
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
