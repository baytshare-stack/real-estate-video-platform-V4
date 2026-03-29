import type { PropertyType, VideoPropertyType } from "@prisma/client";

/** Maps stored video/property enums to the upload form `propertyType` select value. */
export function videoPropertyTypeToFormPropertyType(
  vt: VideoPropertyType | null,
  pt: PropertyType
): string {
  if (vt) {
    switch (vt) {
      case "TOWNHOUSE":
        return "HOUSE";
      case "STUDIO":
        return "APARTMENT";
      case "DUPLEX":
        return "HOUSE";
      case "OTHER":
        return "COMMERCIAL";
      case "APARTMENT":
      case "VILLA":
      case "LAND":
        return vt;
      default:
        return "COMMERCIAL";
    }
  }
  switch (pt) {
    case "APARTMENT":
      return "APARTMENT";
    case "VILLA":
      return "VILLA";
    case "HOUSE":
      return "HOUSE";
    case "LAND":
      return "LAND";
    case "OFFICE":
      return "OFFICE";
    case "SHOP":
      return "SHOP";
    case "COMMERCIAL":
      return "COMMERCIAL";
    default:
      return "COMMERCIAL";
  }
}

/** Strip optional "(lat:…, lng:…)" suffix from stored address for the form. */
export function cleanAddressForForm(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = raw.match(/^(.*?)\s*\(\s*lat:\s*([^,]+)\s*,\s*lng:\s*([^)]+)\s*\)\s*$/);
  if (m) return m[1].trim();
  return raw.trim();
}
