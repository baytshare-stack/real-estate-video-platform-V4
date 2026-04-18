import type { AdPublisher, Prisma, VideoAdSlot } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getMockVideoAdForSlot, type ServedVideoAdPayload } from "@/lib/video-ads/env-mock";

function toPayload(row: {
  id: string;
  videoUrl: string;
  type: VideoAdSlot;
  skippable: boolean;
  skipAfterSeconds: number;
}): ServedVideoAdPayload {
  return {
    id: row.id,
    videoUrl: row.videoUrl,
    type: row.type,
    skippable: row.skippable,
    skipAfterSeconds: row.skipAfterSeconds,
  };
}

function pickRandom<T>(rows: T[]): T | null {
  if (!rows.length) return null;
  return rows[Math.floor(Math.random() * rows.length)]!;
}

function campaignEligible(): Prisma.AdWhereInput {
  const now = new Date();
  return {
    OR: [
      { campaignId: null },
      {
        campaign: {
          status: "ACTIVE",
          startDate: { lte: now },
          endDate: { gte: now },
        },
      },
    ],
  };
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

/**
 * One creative per slot: user listing-targeted → user channel-wide → admin global.
 */
export async function pickVideoAdForWatchContext(
  videoId: string,
  slot: VideoAdSlot
): Promise<ServedVideoAdPayload | null> {
  const mock = getMockVideoAdForSlot(slot);
  if (mock && process.env.VIDEO_ADS_PREFER_MOCK === "1") return mock;

  const ctx = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, channel: { select: { ownerId: true } } },
  });
  const ownerId = ctx?.channel?.ownerId ?? null;

  const adminWhere = {
    active: true,
    type: slot,
    publisher: "ADMIN" as AdPublisher,
  };

  if (ownerId) {
    const tierVideo = await prisma.ad.findMany({
      where: {
        active: true,
        type: slot,
        publisher: "USER",
        targetVideoId: videoId,
        AND: [ownerTargeting(ownerId), campaignEligible()],
      },
      orderBy: { updatedAt: "desc" },
      take: 24,
    });
    const v = pickRandom(tierVideo);
    if (v) return toPayload(v);

    const tierOwnerWide = await prisma.ad.findMany({
      where: {
        active: true,
        type: slot,
        publisher: "USER",
        targetVideoId: null,
        AND: [ownerTargeting(ownerId), campaignEligible()],
      },
      orderBy: { updatedAt: "desc" },
      take: 24,
    });
    const o = pickRandom(tierOwnerWide);
    if (o) return toPayload(o);
  }

  const adminRows = await prisma.ad.findMany({
    where: adminWhere,
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
  const a = pickRandom(adminRows);
  if (a) return toPayload(a);

  return mock;
}

/** @deprecated Use pickVideoAdForWatchContext when videoId is known. */
export async function pickVideoAdForSlot(slot: VideoAdSlot): Promise<ServedVideoAdPayload | null> {
  const mock = getMockVideoAdForSlot(slot);
  if (mock && process.env.VIDEO_ADS_PREFER_MOCK === "1") return mock;

  const rows = await prisma.ad.findMany({
    where: { active: true, type: slot, publisher: "ADMIN" },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
  const row = pickRandom(rows);
  if (row) return toPayload(row);
  return mock;
}
