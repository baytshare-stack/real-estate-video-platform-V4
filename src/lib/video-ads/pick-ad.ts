import type { AdCreativeKind, AdPublisher, AdTextDisplayMode, VideoAdSlot } from "@prisma/client";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getMockVideoAdForSlot } from "@/lib/video-ads/env-mock";
import type { ServedVideoAdPayload } from "@/lib/video-ads/served-ad-payload";

type CampaignBudgetSlice = {
  budget: Prisma.Decimal;
  spent: Prisma.Decimal;
  status: string;
  startDate: Date;
  endDate: Date;
};

type PickAdRow = {
  id: string;
  videoUrl: string | null;
  creativeKind: AdCreativeKind;
  textBody: string | null;
  textDisplayMode: AdTextDisplayMode | null;
  type: VideoAdSlot;
  skippable: boolean;
  skipAfterSeconds: number;
  publisher: AdPublisher;
  campaign: CampaignBudgetSlice | null;
};

function toPayload(row: PickAdRow): ServedVideoAdPayload {
  return {
    id: row.id,
    creativeKind: row.creativeKind,
    videoUrl: row.videoUrl ?? "",
    textBody: row.textBody ?? undefined,
    textDisplayMode: row.textDisplayMode ?? undefined,
    type: row.type,
    skippable: row.skippable,
    skipAfterSeconds: row.skipAfterSeconds,
  };
}

function pickRandom<T>(rows: T[]): T | null {
  if (!rows.length) return null;
  return rows[Math.floor(Math.random() * rows.length)]!;
}

const ZERO = new Prisma.Decimal(0);

function campaignWindowOk(c: CampaignBudgetSlice, now: Date): boolean {
  return c.status === "ACTIVE" && c.startDate <= now && c.endDate >= now;
}

function hasRemainingBudget(c: CampaignBudgetSlice | null): boolean {
  if (!c) return false;
  return c.budget.sub(c.spent).gt(ZERO);
}

function creativeIsComplete(row: PickAdRow): boolean {
  if (row.creativeKind === "TEXT") {
    return Boolean(row.textBody?.trim());
  }
  return Boolean(row.videoUrl?.trim());
}

function userCampaignServable(row: PickAdRow, now: Date): boolean {
  if (row.publisher !== "USER") return true;
  if (!row.campaign) return false;
  if (!campaignWindowOk(row.campaign, now)) return false;
  return hasRemainingBudget(row.campaign);
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

function filterServable(rows: PickAdRow[], now: Date): PickAdRow[] {
  return rows.filter((r) => creativeIsComplete(r) && userCampaignServable(r, now));
}

/**
 * Paid USER inventory first (when eligible), then global ADMIN inventory.
 * USER rows require an active campaign, flight dates, and remaining budget.
 */
export async function pickVideoAdForWatchContext(
  videoId: string,
  slot: VideoAdSlot
): Promise<ServedVideoAdPayload | null> {
  const mock = getMockVideoAdForSlot(slot);
  if (mock && process.env.VIDEO_ADS_PREFER_MOCK === "1") return mock;

  const now = new Date();

  const ctx = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, channel: { select: { ownerId: true } } },
  });
  const ownerId = ctx?.channel?.ownerId ?? null;

  const campaignSelect = {
    budget: true,
    spent: true,
    status: true,
    startDate: true,
    endDate: true,
  } satisfies Prisma.CampaignSelect;

  const adminWhere: Prisma.AdWhereInput = {
    active: true,
    type: slot,
    publisher: "ADMIN",
  };

  if (ownerId) {
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
      select: {
        id: true,
        videoUrl: true,
        creativeKind: true,
        textBody: true,
        textDisplayMode: true,
        type: true,
        skippable: true,
        skipAfterSeconds: true,
        publisher: true,
        campaign: { select: campaignSelect },
      },
    });
    const v = pickRandom(filterServable(tierVideo as PickAdRow[], now));
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
      select: {
        id: true,
        videoUrl: true,
        creativeKind: true,
        textBody: true,
        textDisplayMode: true,
        type: true,
        skippable: true,
        skipAfterSeconds: true,
        publisher: true,
        campaign: { select: campaignSelect },
      },
    });
    const o = pickRandom(filterServable(tierOwnerWide as PickAdRow[], now));
    if (o) return toPayload(o);
  }

  const adminRows = await prisma.ad.findMany({
    where: adminWhere,
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: {
      id: true,
      videoUrl: true,
      creativeKind: true,
      textBody: true,
      textDisplayMode: true,
      type: true,
      skippable: true,
      skipAfterSeconds: true,
      publisher: true,
      campaign: { select: campaignSelect },
    },
  });
  const adminPick = pickRandom(
    filterServable(
      adminRows.map((r) => ({ ...r, campaign: null })) as PickAdRow[],
      now
    )
  );
  if (adminPick) return toPayload(adminPick);

  return mock;
}

/** @deprecated Use pickVideoAdForWatchContext when videoId is known. */
export async function pickVideoAdForSlot(slot: VideoAdSlot): Promise<ServedVideoAdPayload | null> {
  const mock = getMockVideoAdForSlot(slot);
  if (mock && process.env.VIDEO_ADS_PREFER_MOCK === "1") return mock;

  const now = new Date();
  const campaignSelect = {
    budget: true,
    spent: true,
    status: true,
    startDate: true,
    endDate: true,
  } satisfies Prisma.CampaignSelect;

  const rows = await prisma.ad.findMany({
    where: { active: true, type: slot, publisher: "ADMIN" },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: {
      id: true,
      videoUrl: true,
      creativeKind: true,
      textBody: true,
      textDisplayMode: true,
      type: true,
      skippable: true,
      skipAfterSeconds: true,
      publisher: true,
      campaign: { select: campaignSelect },
    },
  });
  const row = pickRandom(filterServable(rows.map((r) => ({ ...r, campaign: null })) as PickAdRow[], now));
  if (row) return toPayload(row);
  return mock;
}
