import type { Ad } from "@prisma/client";
import type { SmartAdSelectionBySlot } from "@/lib/smart-ads/engine";

/** DTO consumed by `WatchVideoAdsShell` + watch API */
export type SmartAdWatchPayload = {
  id: string;
  title: string;
  description: string | null;
  /** Shell positions: BEFORE = pre-roll area, MID, OVERLAY */
  position: "BEFORE" | "MID" | "OVERLAY";
  /** When true, blocks the player until dismissed (true pre-roll). */
  preRollGate: boolean;
  mediaUrl: string;
  clickUrl: string | null;
  track: "smart";
};

function adToPayload(ad: Ad, shellPosition: SmartAdWatchPayload["position"], preRollGate: boolean): SmartAdWatchPayload {
  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    position: shellPosition,
    preRollGate,
    mediaUrl: ad.mediaUrl,
    clickUrl: ad.clickUrl,
    track: "smart",
  };
}

export function selectionToWatchPayloads(selection: SmartAdSelectionBySlot): SmartAdWatchPayload[] {
  const out: SmartAdWatchPayload[] = [];
  if (selection.PRE_ROLL) {
    out.push(adToPayload(selection.PRE_ROLL, "BEFORE", true));
  }
  if (selection.MID_ROLL) {
    out.push(adToPayload(selection.MID_ROLL, "MID", false));
  }
  if (selection.OVERLAY) {
    out.push(adToPayload(selection.OVERLAY, "OVERLAY", false));
  }
  return out;
}

export { isVideoMediaUrl } from "@/lib/smart-ads/is-video-media-url";
