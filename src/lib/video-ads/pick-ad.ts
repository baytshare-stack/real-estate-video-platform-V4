import {
  Prisma,
  type AdAdminReviewStatus,
  type AdMediaType,
  type AdPublisher,
  type AdType,
  type CampaignBidMode,
  type VideoAdSlot,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { getMockVideoAdForSlot } from "@/lib/video-ads/env-mock";
import type { ServedVideoAdPayload } from "@/lib/video-ads/served-ad-payload";
import { intentProfileBoost, loadUserIntentProfileSlice, type UserIntentProfileSlice } from "@/lib/ads-platform/intent-profile-service";
import { getViewerAdExclusions } from "@/lib/ads-platform/viewer-frequency";
import type { TargetingSlice } from "@/lib/video-ads/targeting-match";
import { utcSpendDayString } from "@/lib/ads-platform/monetization-engine";
import {
  isLinearAdPickableForSlot,
  isNonLinearCta,
  isNonLinearOverlayFamily,
  resolveAdType,
} from "@/lib/video-ads/resolve-ad-type";
import { targetingMatches, targetingRelevanceScore } from "@/lib/video-ads/targeting-match";
import { loadWatchVideoContext, type WatchVideoContext } from "@/lib/video-ads/watch-context";

export type PickVideoAdOptions = {
  viewerKey?: string | null;
  viewerUserId?: string | null;
};

type CampaignSlice = {
  budget: Prisma.Decimal;
  spent: Prisma.Decimal;
  dailyBudget: Prisma.Decimal;
  spentToday: Prisma.Decimal;
  spendDayUtc: string;
  bidAmount: Prisma.Decimal;
  status: string;
  startDate: Date;
  endDate: Date;
  bidWeight: number;
  bidMode: CampaignBidMode;
  cpmBid: Prisma.Decimal | null;
  cpcBid: Prisma.Decimal | null;
  cplBid: Prisma.Decimal | null;
};

type PerfSlice = {
  impressions: number;
  views: number;
  clicks: number;
  leads: number;
  watchTime: number;
};

type PickAdRow = {
  id: string;
  mediaType: AdMediaType;
  videoUrl: string | null;
  imageUrl: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
  ctaType: ServedVideoAdPayload["ctaType"];
  ctaLabel: string | null;
  ctaUrl: string | null;
  type: VideoAdSlot;
  adType: AdType;
  skippable: boolean;
  skipAfterSeconds: number;
  publisher: AdPublisher;
  adminReviewStatus: AdAdminReviewStatus;
  owner: { isBlocked: boolean } | null;
  campaign: CampaignSlice | null;
  targeting: TargetingSlice | null;
  performance: PerfSlice | null;
};

function toPayload(row: PickAdRow): ServedVideoAdPayload {
  return {
    id: row.id,
    mediaType: row.mediaType,
    videoUrl: row.videoUrl,
    imageUrl: row.imageUrl,
    thumbnail: row.thumbnail,
    durationSeconds: row.durationSeconds,
    ctaType: row.ctaType,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    type: row.type,
    adType: row.adType,
    skippable: row.skippable,
    skipAfterSeconds: row.skipAfterSeconds,
  };
}

const ZERO = new Prisma.Decimal(0);

function campaignWindowOk(c: CampaignSlice, now: Date): boolean {
  return c.status === "ACTIVE" && c.startDate <= now && c.endDate >= now;
}

function hasRemainingBudget(c: CampaignSlice | null): boolean {
  if (!c) return false;
  return c.budget.sub(c.spent).gt(ZERO);
}

/** Daily cap: compare effective same-day spend to `dailyBudget` (UTC day). */
function hasDailyBudgetRemaining(c: CampaignSlice, now: Date): boolean {
  const cap = Number(c.dailyBudget.toString());
  if (!Number.isFinite(cap) || cap <= 0) return true;
  const spentToday =
    c.spendDayUtc === utcSpendDayString(now) ? Number(c.spentToday.toString()) : 0;
  return spentToday < cap;
}

function creativeIsComplete(row: PickAdRow): boolean {
  if (row.mediaType === "IMAGE") return Boolean(row.imageUrl?.trim());
  return Boolean(row.videoUrl?.trim());
}

/** USER ads must be APPROVED; blocked users’ ads never serve. REJECTED never serves. */
function reviewAndOwnerAllowServe(row: PickAdRow): boolean {
  console.log("Ad status:", row.adminReviewStatus);
  if (row.adminReviewStatus === "REJECTED") return false;
  if (row.publisher === "USER") {
    if (row.adminReviewStatus !== "APPROVED") return false;
    if (row.owner?.isBlocked) return false;
  }
  return true;
}

function userCampaignServable(row: PickAdRow, now: Date): boolean {
  if (row.publisher !== "USER") return true;
  if (!row.campaign) return false;
  console.log("Campaign status:", row.campaign.status);
  if (!campaignWindowOk(row.campaign, now)) return false;
  if (!hasRemainingBudget(row.campaign)) return false;
  return hasDailyBudgetRemaining(row.campaign, now);
}

function deliveryStatusAllowsServe(row: PickAdRow): boolean {
  if (row.publisher !== "USER") return true;
  return row.adminReviewStatus === "APPROVED" && row.campaign?.status === "ACTIVE";
}

/** Listing owner (channel owner) matches ad owner, or ad is owned by an agency that employs that owner. */
function ownerTargeting(ownerId: string): Prisma.AdWhereInput {
  return {
    OR: [
      { ownerId },
      { owner: { role: "AGENCY", agencyAgents: { some: { id: ownerId } } } },
    ],
  };
}

const campaignActiveWhere = (now: Date) =>
  ({
    status: "ACTIVE",
    startDate: { lte: now },
    endDate: { gte: now },
  }) as const;

function monetizationBidScoreTerm(row: PickAdRow): number {
  const c = row.campaign;
  if (!c) return 12;
  const bidAmt = Number(c.bidAmount.toString());
  if (Number.isFinite(bidAmt) && bidAmt > 0) {
    return Math.log(1 + bidAmt) * 9 + 8;
  }
  const w = c.bidWeight * 25;
  if (c.bidMode === "WEIGHTED") return w;
  const log = (d: Prisma.Decimal | null | undefined) => {
    if (!d) return 0;
    const n = Number(d.toString());
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.log(1 + n) * 5;
  };
  switch (c.bidMode) {
    case "CPM":
      return w * 0.45 + log(c.cpmBid) * 6 + 6;
    case "CPC":
      return w * 0.45 + log(c.cpcBid) * 6 + 6;
    case "CPL":
      return w * 0.45 + log(c.cplBid) * 6 + 6;
    default:
      return w;
  }
}

function ctrWeight(perf: PerfSlice | null | undefined): number {
  const impr = perf?.impressions ?? 0;
  const clk = perf?.clicks ?? 0;
  if (impr < 25) return Math.min(18, clk * 0.35);
  const ctr = clk / impr;
  return Math.min(30, ctr * 900);
}

/** Slightly boost high-CTR / high-conversion ads; dampen chronic under-performers (AI pacing). */
function aiDeliveryMultiplier(perf: PerfSlice | null | undefined): number {
  const impr = perf?.impressions ?? 0;
  const clk = perf?.clicks ?? 0;
  const leads = perf?.leads ?? 0;
  if (impr < 45) return 1;
  const ctr = clk / impr;
  const convToClick = clk > 0 ? leads / clk : 0;
  let m = 1;
  if (ctr >= 0.018) m *= 1.09;
  if (ctr < 0.0035 && impr > 220) m *= 0.87;
  if (convToClick >= 0.07 && clk >= 12) m *= 1.06;
  return Math.min(1.14, Math.max(0.78, m));
}

function adScore(
  row: PickAdRow,
  ctx: NonNullable<Awaited<ReturnType<typeof loadWatchVideoContext>>>,
  intentProfile: UserIntentProfileSlice | null
): number {
  const relevanceScore = targetingRelevanceScore(ctx, row.targeting) + intentProfileBoost(ctx, intentProfile);
  const bidAmountScore = monetizationBidScoreTerm(row);
  const performanceScore = ctrWeight(row.performance);
  const raw = bidAmountScore + relevanceScore + performanceScore;
  return raw * aiDeliveryMultiplier(row.performance);
}

/** Weighted pick among top-N scores for rotation (still favors best ads). */
function weightedPickTop(
  rows: PickAdRow[],
  ctx: NonNullable<Awaited<ReturnType<typeof loadWatchVideoContext>>>,
  intentProfile: UserIntentProfileSlice | null,
  topN: number
): PickAdRow | null {
  if (!rows.length) return null;
  const scored = rows.map((r) => ({ r, s: adScore(r, ctx, intentProfile) }));
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, Math.max(1, topN));
  const weights = top.map((x) => Math.pow(Math.max(0.05, x.s), 1.15));
  const sum = weights.reduce((a, w) => a + w, 0);
  let t = Math.random() * sum;
  for (let i = 0; i < top.length; i++) {
    t -= weights[i]!;
    if (t <= 0) return top[i]!.r;
  }
  return top[0]!.r;
}

function applyFrequencyFilter(rows: PickAdRow[], excluded: Set<string>): PickAdRow[] {
  const filtered = rows.filter((r) => !excluded.has(r.id));
  return filtered.length ? filtered : rows;
}

function filterUserRows(
  rows: PickAdRow[],
  ctx: NonNullable<Awaited<ReturnType<typeof loadWatchVideoContext>>>,
  now: Date,
  requestedSlot: VideoAdSlot
) {
  return rows.filter(
    (r) =>
      creativeIsComplete(r) &&
      deliveryStatusAllowsServe(r) &&
      reviewAndOwnerAllowServe(r) &&
      userCampaignServable(r, now) &&
      targetingMatches(ctx, r.targeting) &&
      isLinearAdPickableForSlot(resolveAdType(r), requestedSlot, r.type)
  );
}

function filterAdminRows(
  rows: PickAdRow[],
  ctx: NonNullable<Awaited<ReturnType<typeof loadWatchVideoContext>>>,
  now: Date,
  requestedSlot: VideoAdSlot
) {
  return rows
    .map((r) => ({ ...r, campaign: null as CampaignSlice | null }))
    .filter(
      (r) =>
        creativeIsComplete(r) &&
        deliveryStatusAllowsServe(r) &&
        reviewAndOwnerAllowServe(r) &&
        userCampaignServable(r, now) &&
        targetingMatches(ctx, r.targeting) &&
        isLinearAdPickableForSlot(resolveAdType(r), requestedSlot, r.type)
    );
}

function filterAdminRowsNoCtx(rows: PickAdRow[], now: Date, requestedSlot: VideoAdSlot) {
  return rows
    .map((r) => ({ ...r, campaign: null as CampaignSlice | null }))
    .filter(
      (r) =>
        creativeIsComplete(r) &&
        deliveryStatusAllowsServe(r) &&
        reviewAndOwnerAllowServe(r) &&
        userCampaignServable(r, now) &&
        isLinearAdPickableForSlot(resolveAdType(r), requestedSlot, r.type)
    );
}

const targetingSelect = {
  countries: true,
  cities: true,
  propertyTypes: true,
  priceMin: true,
  priceMax: true,
  userIntent: true,
} satisfies Prisma.TargetingSelect;

const perfSelect = {
  impressions: true,
  views: true,
  clicks: true,
  leads: true,
  watchTime: true,
} satisfies Prisma.AdPerformanceSelect;

const adPickSelect = {
  id: true,
  mediaType: true,
  videoUrl: true,
  imageUrl: true,
  thumbnail: true,
  durationSeconds: true,
  ctaType: true,
  ctaLabel: true,
  ctaUrl: true,
  type: true,
  adType: true,
  skippable: true,
  skipAfterSeconds: true,
  publisher: true,
  adminReviewStatus: true,
  owner: { select: { isBlocked: true } },
  targeting: { select: targetingSelect },
  performance: { select: perfSelect },
  campaign: {
    select: {
      budget: true,
      spent: true,
      dailyBudget: true,
      spentToday: true,
      spendDayUtc: true,
      bidAmount: true,
      status: true,
      startDate: true,
      endDate: true,
      bidWeight: true,
      bidMode: true,
      cpmBid: true,
      cpcBid: true,
      cplBid: true,
    },
  },
} satisfies Prisma.AdSelect;

const ROTATION_TOP_N = 4;

/**
 * Paid USER inventory first (when eligible), then global ADMIN inventory.
 * Targeting + intent profile + bid mode (CPM/CPC/CPL) + CTR + AI multiplier; frequency caps + weighted rotation.
 */
export async function pickVideoAdForWatchContext(
  videoId: string,
  slot: VideoAdSlot,
  opts?: PickVideoAdOptions
): Promise<ServedVideoAdPayload | null> {
  const mock = getMockVideoAdForSlot(slot);
  if (mock && process.env.VIDEO_ADS_PREFER_MOCK === "1") return mock;

  const viewerKey = opts?.viewerKey ?? null;
  const viewerUserId = opts?.viewerUserId ?? null;
  const [ctx, excluded, intentProfile] = await Promise.all([
    loadWatchVideoContext(videoId),
    getViewerAdExclusions(viewerKey),
    loadUserIntentProfileSlice(viewerUserId),
  ]);
  const now = new Date();

  if (!ctx) {
    const fallbackCtx: WatchVideoContext = {
      videoId,
      channelOwnerId: "",
      country: null,
      city: null,
      propertyTypeKey: null,
      price: null,
      intent: null,
    };
    const adminRows = await prisma.ad.findMany({
      where: { active: true, type: slot, publisher: "ADMIN" },
      orderBy: { updatedAt: "desc" },
      take: 48,
      select: adPickSelect,
    });
    let pool = filterAdminRowsNoCtx(adminRows as PickAdRow[], now, slot);
    pool = applyFrequencyFilter(pool, excluded);
    const pick = weightedPickTop(pool, fallbackCtx, intentProfile, ROTATION_TOP_N);
    if (pick) return toPayload(pick);
    const row = pool.length ? pool[Math.floor(Math.random() * pool.length)]! : null;
    return row ? toPayload(row) : mock;
  }

  const ownerId = ctx.channelOwnerId;

  const tierVideo = await prisma.ad.findMany({
    where: {
      active: true,
      type: slot,
      publisher: "USER",
      targetVideoId: videoId,
      campaignId: { not: null },
      AND: [ownerTargeting(ownerId), { campaign: campaignActiveWhere(now) }],
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: adPickSelect,
  });
  let u1 = applyFrequencyFilter(filterUserRows(tierVideo as PickAdRow[], ctx, now, slot), excluded);
  const v = weightedPickTop(u1, ctx, intentProfile, ROTATION_TOP_N);
  if (v) return toPayload(v);

  const tierOwnerWide = await prisma.ad.findMany({
    where: {
      active: true,
      type: slot,
      publisher: "USER",
      targetVideoId: null,
      campaignId: { not: null },
      AND: [ownerTargeting(ownerId), { campaign: campaignActiveWhere(now) }],
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: adPickSelect,
  });
  let u2 = applyFrequencyFilter(filterUserRows(tierOwnerWide as PickAdRow[], ctx, now, slot), excluded);
  const o = weightedPickTop(u2, ctx, intentProfile, ROTATION_TOP_N);
  if (o) return toPayload(o);

  const adminRows = await prisma.ad.findMany({
    where: { active: true, type: slot, publisher: "ADMIN" },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: adPickSelect,
  });
  let u3 = applyFrequencyFilter(filterAdminRows(adminRows as PickAdRow[], ctx, now, slot), excluded);
  const adminPick = weightedPickTop(u3, ctx, intentProfile, ROTATION_TOP_N);
  if (adminPick) return toPayload(adminPick);

  return mock;
}

function filterNonLinearRows(
  rows: PickAdRow[],
  ctx: NonNullable<Awaited<ReturnType<typeof loadWatchVideoContext>>>,
  now: Date,
  kind: "OVERLAY" | "CTA"
) {
  const match = (r: PickAdRow) => {
    if (r.type !== "PRE_ROLL") return false;
    const t = resolveAdType(r);
    if (kind === "CTA") return isNonLinearCta(t);
    return isNonLinearOverlayFamily(t);
  };
  return rows.filter(
    (r) =>
      match(r) &&
      creativeIsComplete(r) &&
      deliveryStatusAllowsServe(r) &&
      reviewAndOwnerAllowServe(r) &&
      userCampaignServable(r, now) &&
      targetingMatches(ctx, r.targeting)
  );
}

function filterNonLinearRowsNoCtx(rows: PickAdRow[], now: Date, kind: "OVERLAY" | "CTA") {
  const match = (r: PickAdRow) => {
    if (r.type !== "PRE_ROLL") return false;
    const t = resolveAdType(r);
    if (kind === "CTA") return isNonLinearCta(t);
    return isNonLinearOverlayFamily(t);
  };
  return rows
    .map((r) => ({ ...r, campaign: null as CampaignSlice | null }))
    .filter(
      (r) =>
        match(r) &&
        creativeIsComplete(r) &&
        deliveryStatusAllowsServe(r) &&
        reviewAndOwnerAllowServe(r) &&
        userCampaignServable(r, now)
    );
}

/**
 * OVERLAY/COMPANION/CTA creatives share DB `type: PRE_ROLL`; pick here for floating player UI (not linear takeover).
 */
export async function pickNonLinearVideoAdForWatchContext(
  videoId: string,
  kind: "OVERLAY" | "CTA",
  opts?: PickVideoAdOptions
): Promise<ServedVideoAdPayload | null> {
  const viewerKey = opts?.viewerKey ?? null;
  const viewerUserId = opts?.viewerUserId ?? null;
  const [ctx, excluded, intentProfile] = await Promise.all([
    loadWatchVideoContext(videoId),
    getViewerAdExclusions(viewerKey),
    loadUserIntentProfileSlice(viewerUserId),
  ]);
  const now = new Date();

  const adTypeWhere =
    kind === "CTA"
      ? ({ adType: "CTA" } as const)
      : ({ adType: { in: ["OVERLAY", "COMPANION"] as AdType[] } });

  if (!ctx) {
    const fallbackCtx: WatchVideoContext = {
      videoId,
      channelOwnerId: "",
      country: null,
      city: null,
      propertyTypeKey: null,
      price: null,
      intent: null,
    };
    const adminRows = await prisma.ad.findMany({
      where: { active: true, type: "PRE_ROLL", publisher: "ADMIN", ...adTypeWhere },
      orderBy: { updatedAt: "desc" },
      take: 48,
      select: adPickSelect,
    });
    let pool = filterNonLinearRowsNoCtx(adminRows as PickAdRow[], now, kind);
    pool = applyFrequencyFilter(pool, excluded);
    const pick = weightedPickTop(pool, fallbackCtx, intentProfile, ROTATION_TOP_N);
    if (pick) return toPayload(pick);
    const row = pool.length ? pool[Math.floor(Math.random() * pool.length)]! : null;
    return row ? toPayload(row) : null;
  }

  const ownerId = ctx.channelOwnerId;

  const tierVideo = await prisma.ad.findMany({
    where: {
      active: true,
      type: "PRE_ROLL",
      publisher: "USER",
      targetVideoId: videoId,
      campaignId: { not: null },
      AND: [ownerTargeting(ownerId), { campaign: campaignActiveWhere(now) }, adTypeWhere],
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: adPickSelect,
  });
  let u1 = applyFrequencyFilter(filterNonLinearRows(tierVideo as PickAdRow[], ctx, now, kind), excluded);
  const v = weightedPickTop(u1, ctx, intentProfile, ROTATION_TOP_N);
  if (v) return toPayload(v);

  const tierOwnerWide = await prisma.ad.findMany({
    where: {
      active: true,
      type: "PRE_ROLL",
      publisher: "USER",
      targetVideoId: null,
      campaignId: { not: null },
      AND: [ownerTargeting(ownerId), { campaign: campaignActiveWhere(now) }, adTypeWhere],
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: adPickSelect,
  });
  let u2 = applyFrequencyFilter(filterNonLinearRows(tierOwnerWide as PickAdRow[], ctx, now, kind), excluded);
  const o = weightedPickTop(u2, ctx, intentProfile, ROTATION_TOP_N);
  if (o) return toPayload(o);

  const adminRows = await prisma.ad.findMany({
    where: { active: true, type: "PRE_ROLL", publisher: "ADMIN", ...adTypeWhere },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: adPickSelect,
  });
  let u3 = applyFrequencyFilter(filterNonLinearRows(adminRows as PickAdRow[], ctx, now, kind), excluded);
  const adminPick = weightedPickTop(u3, ctx, intentProfile, ROTATION_TOP_N);
  if (adminPick) return toPayload(adminPick);

  return null;
}

/** @deprecated Use pickVideoAdForWatchContext when videoId is known. */
export async function pickVideoAdForSlot(slot: VideoAdSlot): Promise<ServedVideoAdPayload | null> {
  return pickVideoAdForWatchContext("__unknown__", slot, {});
}
