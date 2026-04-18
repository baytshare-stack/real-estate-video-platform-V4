import type { VideoAdSlot } from "@prisma/client";
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

/** Random choice among active creatives for the slot (simple exploration). */
export async function pickVideoAdForSlot(slot: VideoAdSlot): Promise<ServedVideoAdPayload | null> {
  const mock = getMockVideoAdForSlot(slot);
  if (mock && process.env.VIDEO_ADS_PREFER_MOCK === "1") return mock;

  const rows = await prisma.ad.findMany({
    where: { active: true, type: slot },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
  if (rows.length) {
    const row = rows[Math.floor(Math.random() * rows.length)]!;
    return toPayload(row);
  }

  return mock;
}
