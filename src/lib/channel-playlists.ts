import type { Prisma, PropertyType, VideoPropertyType } from "@prisma/client";

/** Channel + playlist pages: same visibility as Shorts feed */
export const CHANNEL_PUBLIC_VIDEO_WHERE: Prisma.VideoWhereInput = {
  moderationStatus: { in: ["APPROVED", "PENDING"] },
};

/** Order of playlist strips on the channel “Playlists” tab */
export const CHANNEL_PLAYLIST_ORDER: VideoPropertyType[] = [
  "VILLA",
  "APARTMENT",
  "TOWNHOUSE",
  "STUDIO",
  "DUPLEX",
  "LAND",
  "OTHER",
];

export const CHANNEL_PLAYLIST_LABELS: Record<VideoPropertyType, string> = {
  APARTMENT: "Apartments",
  VILLA: "Villas",
  TOWNHOUSE: "Townhouses",
  STUDIO: "Studios",
  DUPLEX: "Duplexes",
  LAND: "Lands",
  OTHER: "Other",
};

const PLAYLIST_SET = new Set<string>(CHANNEL_PLAYLIST_ORDER);

export function isChannelPlaylistType(s: string): s is VideoPropertyType {
  return PLAYLIST_SET.has(s);
}

/**
 * When `Video.propertyType` is missing (legacy rows), infer playlist from `Property.propertyType`.
 * Note: STUDIO/DUPLEX lose specificity when only Property rows exist (both map via upload rules).
 */
export function mapPropertyRowToPlaylistCategory(
  propertyType: PropertyType | null | undefined
): VideoPropertyType {
  switch (propertyType) {
    case "APARTMENT":
      return "APARTMENT";
    case "VILLA":
      return "VILLA";
    case "LAND":
      return "LAND";
    case "HOUSE":
      return "TOWNHOUSE";
    case "OFFICE":
    case "SHOP":
    case "COMMERCIAL":
      return "OTHER";
    default:
      return "OTHER";
  }
}

export type VideoForPlaylist = {
  propertyType: VideoPropertyType | null;
  property: { propertyType: PropertyType } | null;
};

/** Playlist bucket for a long-form video (uses denormalized `Video.propertyType` first). */
export function playlistCategoryForVideo(v: VideoForPlaylist): VideoPropertyType {
  if (v.propertyType) return v.propertyType;
  return mapPropertyRowToPlaylistCategory(v.property?.propertyType);
}
