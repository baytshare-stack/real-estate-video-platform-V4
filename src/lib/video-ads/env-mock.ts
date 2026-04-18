import type { VideoAdSlot } from "@prisma/client";

export type ServedVideoAdPayload = {
  id: string;
  videoUrl: string;
  type: VideoAdSlot;
  skippable: boolean;
  skipAfterSeconds: number;
};

function trimUrl(v: string | undefined) {
  const s = (v || "").trim();
  return s.length ? s : null;
}

/** Optional demo URLs — no DB rows required. */
export function getMockVideoAdForSlot(slot: VideoAdSlot): ServedVideoAdPayload | null {
  const pre = trimUrl(process.env.VIDEO_ADS_DEMO_PRE_ROLL_URL);
  const mid = trimUrl(process.env.VIDEO_ADS_DEMO_MID_ROLL_URL);
  const url = slot === "PRE_ROLL" ? pre ?? mid : mid ?? pre;
  if (!url) return null;
  const skipAfter = Math.max(0, Number(process.env.VIDEO_ADS_DEMO_SKIP_AFTER_SECONDS || 5) || 5);
  const skippable = process.env.VIDEO_ADS_DEMO_NON_SKIPPABLE !== "1";
  return {
    id: `mock-${slot.toLowerCase()}`,
    videoUrl: url,
    type: slot,
    skippable,
    skipAfterSeconds: skipAfter,
  };
}
