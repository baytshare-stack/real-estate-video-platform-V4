import { Prisma } from "@prisma/client";

const ZERO = new Prisma.Decimal(0);

export type ValidateResult = { ok: true } | { ok: false; error: string };

/** Studio: campaign → ACTIVE */
export function validateCampaignActivation(c: {
  budget: Prisma.Decimal;
  spent: Prisma.Decimal;
  status: string;
}): ValidateResult {
  if (c.status === "DELETED") return { ok: false, error: "Cannot activate a deleted campaign." };
  if (c.budget.lte(ZERO)) return { ok: false, error: "Campaign budget must be greater than zero." };
  if (c.budget.sub(c.spent).lte(ZERO)) {
    return { ok: false, error: "No remaining campaign budget. Add budget or recharge wallet." };
  }
  return { ok: true };
}

/** Studio: ad → ACTIVE (must have media; campaign must be ACTIVE with budget). */
export function validateAdActivation(
  ad: {
    type: "VIDEO" | "IMAGE";
    videoUrl: string | null;
    imageUrl: string | null;
    status: string;
  },
  campaign: { status: string; budget: Prisma.Decimal; spent: Prisma.Decimal }
): ValidateResult {
  if (ad.status === "DELETED") return { ok: false, error: "Cannot activate a deleted ad." };
  if (campaign.status === "DELETED" || campaign.status === "ENDED") {
    return { ok: false, error: "Campaign is not eligible for delivery." };
  }
  if (campaign.status !== "ACTIVE") {
    return { ok: false, error: "Activate the campaign first, then activate the ad." };
  }
  const budgetOk = validateCampaignActivation(campaign);
  if (!budgetOk.ok) return budgetOk;
  if (ad.type === "VIDEO" && !ad.videoUrl?.trim()) {
    return { ok: false, error: "Video ad requires a valid video URL." };
  }
  if (ad.type === "IMAGE" && !ad.imageUrl?.trim()) {
    return { ok: false, error: "Image ad requires a valid image URL." };
  }
  return { ok: true };
}
