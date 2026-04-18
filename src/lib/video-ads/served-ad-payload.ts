import type { AdCtaType, AdMediaType, VideoAdSlot } from "@prisma/client";

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
  skippable: boolean;
  skipAfterSeconds: number;
};
