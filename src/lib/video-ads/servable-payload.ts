import type { ServedVideoAdPayload } from "@/lib/video-ads/served-ad-payload";

/** Drop ads with missing creative URLs so the player never receives an unloadable payload. */
export function servableVideoAdPayload(ad: ServedVideoAdPayload | null): ServedVideoAdPayload | null {
  if (!ad) return null;
  if (ad.mediaType === "IMAGE" && !(ad.imageUrl || "").trim()) return null;
  if (ad.mediaType === "VIDEO" && !(ad.videoUrl || "").trim()) return null;
  return ad;
}
