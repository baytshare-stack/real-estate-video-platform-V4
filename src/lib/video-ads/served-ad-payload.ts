import type { AdCtaType, AdMediaType, AdType, VideoAdSlot } from "@prisma/client";

/** JSON shape returned by `/api/ads/for-video` and consumed by `WatchVideoAdsShell`. */
export type ServedVideoAdPayload = {
  id: string;
  mediaType: AdMediaType;
  videoUrl: string | null;
  imageUrl: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
  ctaType: AdCtaType;
  ctaLabel: string | null;
  ctaUrl: string | null;
  type: VideoAdSlot;
  /** Creative format; linear uses PRE_ROLL_* / MID_ROLL; overlays/CTA use DB `adType` while `type` stays PRE_ROLL. */
  adType: AdType;
  skippable: boolean;
  skipAfterSeconds: number;
};
