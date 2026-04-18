import type { AdCreativeKind, AdTextDisplayMode, VideoAdSlot } from "@prisma/client";

/** JSON shape returned by `/api/ads/for-video` and consumed by `WatchVideoAdsShell`. */
export type ServedVideoAdPayload = {
  id: string;
  creativeKind: AdCreativeKind;
  /** Set for VIDEO creatives (may be empty string for malformed rows; client should guard). */
  videoUrl: string;
  textBody?: string;
  textDisplayMode?: AdTextDisplayMode;
  type: VideoAdSlot;
  skippable: boolean;
  skipAfterSeconds: number;
};
