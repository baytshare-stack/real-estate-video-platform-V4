import { PropertyType, VideoPropertyType } from "@prisma/client";
import prisma from "@/lib/prisma";

const VIDEO_PROPERTY_TYPES = [
  "APARTMENT",
  "VILLA",
  "TOWNHOUSE",
  "STUDIO",
  "DUPLEX",
  "LAND",
  "OTHER",
] as const satisfies readonly VideoPropertyType[];

export type VideoPropertyTypeInput = (typeof VIDEO_PROPERTY_TYPES)[number];

export function isVideoPropertyTypeString(v: string): v is VideoPropertyTypeInput {
  return (VIDEO_PROPERTY_TYPES as readonly string[]).includes(v);
}

export function mapVideoPropertyTypeToPropertyType(v: VideoPropertyType): PropertyType {
  switch (v) {
    case "APARTMENT":
      return "APARTMENT";
    case "VILLA":
      return "VILLA";
    case "TOWNHOUSE":
      return "HOUSE";
    case "STUDIO":
      return "APARTMENT";
    case "DUPLEX":
      return "HOUSE";
    case "LAND":
      return "LAND";
    case "OTHER":
      return "COMMERCIAL";
    default:
      return "COMMERCIAL";
  }
}

export function mapPropertyTypeToVideoPropertyType(p: PropertyType): VideoPropertyType {
  switch (p) {
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

/**
 * Resolves upload `propertyType` string: admin catalog slug first, then legacy video/property enums.
 */
export async function resolvePropertyTypesFromInput(raw: string): Promise<{
  propertyType: PropertyType;
  videoPropertyType: VideoPropertyType;
} | null> {
  const input = String(raw).toUpperCase().trim();
  if (!input) return null;

  const catalog = await prisma.listingPropertyType.findFirst({
    where: { slug: input, active: true },
    select: { mapProperty: true, mapVideo: true },
  });
  if (catalog) {
    return { propertyType: catalog.mapProperty, videoPropertyType: catalog.mapVideo };
  }

  if (isVideoPropertyTypeString(input)) {
    const v = input as VideoPropertyType;
    return {
      videoPropertyType: v,
      propertyType: mapVideoPropertyTypeToPropertyType(v),
    };
  }

  if (Object.values(PropertyType).includes(input as PropertyType)) {
    const p = input as PropertyType;
    return {
      propertyType: p,
      videoPropertyType: mapPropertyTypeToVideoPropertyType(p),
    };
  }

  return null;
}
