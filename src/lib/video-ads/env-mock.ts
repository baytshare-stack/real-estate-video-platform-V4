import type { AdType, VideoAdSlot } from "@prisma/client";
import type { ServedVideoAdPayload } from "@/lib/video-ads/served-ad-payload";

export type { ServedVideoAdPayload };

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
  const adType: AdType = slot === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL_SKIPPABLE";
  return {
    id: `mock-${slot.toLowerCase()}`,
    mediaType: "VIDEO",
    videoUrl: url,
    imageUrl: null,
    thumbnail: null,
    durationSeconds: null,
    ctaType: "WHATSAPP",
    ctaLabel: "WhatsApp",
    ctaUrl: null,
    type: slot,
    adType,
    skippable,
    skipAfterSeconds: skipAfter,
  };
}
