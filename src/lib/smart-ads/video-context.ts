import { normalizeTargetingValue } from "@/lib/smart-ads/normalize";

export type VideoAdMatchContext = {
  videoId: string;
  /** Normalized category label used for matching */
  categoryNorm: string;
  /** Normalized location label used for matching */
  locationNorm: string;
  /** Same as DB `viewsCount` — watch API exposes as `views` for clients */
  views: number;
};

type VideoWithProperty = {
  id: string;
  viewsCount: number;
  category?: string | null;
  location?: string | null;
  propertyType?: string | null;
  property?: { city: string; country: string } | null;
};

export function buildVideoAdMatchContext(video: VideoWithProperty): VideoAdMatchContext {
  const categoryRaw =
    (video.category && video.category.trim()) ||
    (video.propertyType ? String(video.propertyType) : "") ||
    "";
  const locationRaw =
    (video.location && video.location.trim()) ||
    (video.property ? [video.property.city, video.property.country].filter(Boolean).join(", ") : "") ||
    "";

  return {
    videoId: video.id,
    categoryNorm: normalizeTargetingValue(categoryRaw),
    locationNorm: normalizeTargetingValue(locationRaw),
    views: video.viewsCount ?? 0,
  };
}
