import type { AdType, VideoAdSlot } from "@prisma/client";

const AD_TYPE_VALUES: readonly AdType[] = [
  "PRE_ROLL_SKIPPABLE",
  "PRE_ROLL_NON_SKIPPABLE",
  "MID_ROLL",
  "OVERLAY",
  "COMPANION",
  "CTA",
] as const;

/**
 * Safe read: missing/null `adType` (pre-migration rows) → skippable pre-roll.
 * Prefer this over direct `ad.adType` access in new code paths.
 */
export function resolveAdType(ad: { adType?: AdType | null }): AdType {
  return ad.adType ?? "PRE_ROLL_SKIPPABLE";
}

/** Parse API/body input; returns null if absent or invalid (caller keeps legacy `type` behavior). */
export function parseAdTypeInput(v: unknown): AdType | null {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).toUpperCase();
  return (AD_TYPE_VALUES as readonly string[]).includes(s) ? (s as AdType) : null;
}

/** Maps creative format to DB `type` (placement index) + default skippable. */
export function applyAdTypeToSlotAndSkippable(adType: AdType): {
  type: VideoAdSlot;
  skippable: boolean;
} {
  switch (adType) {
    case "PRE_ROLL_SKIPPABLE":
      return { type: "PRE_ROLL", skippable: true };
    case "PRE_ROLL_NON_SKIPPABLE":
      return { type: "PRE_ROLL", skippable: false };
    case "MID_ROLL":
      return { type: "MID_ROLL", skippable: true };
    case "OVERLAY":
    case "COMPANION":
    case "CTA":
      return { type: "PRE_ROLL", skippable: true };
    default:
      return { type: "PRE_ROLL", skippable: true };
  }
}

/** Keep `adType` aligned when clients only send legacy `type` + `skippable`. */
export function syncAdTypeFromSlotAndSkippable(type: VideoAdSlot, skippable: boolean): AdType {
  if (type === "MID_ROLL") return "MID_ROLL";
  return skippable ? "PRE_ROLL_SKIPPABLE" : "PRE_ROLL_NON_SKIPPABLE";
}

function isReservedNonLinearFormat(t: AdType): boolean {
  return t === "OVERLAY" || t === "COMPANION" || t === "CTA";
}

/**
 * Linear in-stream ads only. Overlay/companion/CTA are stored but not picked until the player supports them.
 */
export function isLinearAdPickableForSlot(resolved: AdType, requestedSlot: VideoAdSlot): boolean {
  if (requestedSlot === "MID_ROLL") return resolved === "MID_ROLL";
  if (requestedSlot === "PRE_ROLL") {
    return resolved === "PRE_ROLL_SKIPPABLE" || resolved === "PRE_ROLL_NON_SKIPPABLE";
  }
  return false;
}

export function shouldSyncAdTypeOnLegacyPatch(
  existing: { adType?: AdType | null },
  body: { type?: unknown; skippable?: boolean; adType?: unknown }
): boolean {
  if (parseAdTypeInput(body.adType) != null) return false;
  const touchedType = body.type === "PRE_ROLL" || body.type === "MID_ROLL";
  const touchedSkip = typeof body.skippable === "boolean";
  if (!touchedType && !touchedSkip) return false;
  if (isReservedNonLinearFormat(resolveAdType(existing)) && !touchedType) return false;
  return true;
}
