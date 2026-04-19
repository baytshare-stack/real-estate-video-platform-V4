import { Prisma, type CampaignBillingType } from "@prisma/client";

const ZERO = new Prisma.Decimal(0);

/** Wire labels for Studio (API + UI). DB enum remains CPC for cost-per-click. */
export type StudioBillingWire = "CBC" | "CPL" | "CPM";

/**
 * Studio campaign create/update: only CBC | CPL | CPM (case-insensitive).
 * Maps CBC → Prisma CPC. Rejects any other string (including legacy "CPC" free text).
 */
export function parseStrictStudioBillingModel(v: unknown): { ok: true; prisma: CampaignBillingType } | { ok: false; error: string } {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "CBC") return { ok: true, prisma: "CPC" };
  if (s === "CPL") return { ok: true, prisma: "CPL" };
  if (s === "CPM") return { ok: true, prisma: "CPM" };
  if (!s) return { ok: false, error: "billingType is required. Use CBC, CPL, or CPM." };
  return { ok: false, error: "billingType must be exactly CBC, CPL, or CPM." };
}

/** Map DB value to Studio wire for dropdowns (CPC in DB → CBC in UI). */
export function prismaBillingTypeToStudioWire(t: CampaignBillingType): StudioBillingWire {
  if (t === "CPC") return "CBC";
  if (t === "CPL") return "CPL";
  return "CPM";
}

/** Legacy / internal: loose parse (defaults unknown → CPM). Prefer parseStrictStudioBillingModel for Studio writes. */
export function parseBillingTypeInput(v: unknown): CampaignBillingType {
  const s = String(v ?? "CPM").toUpperCase().trim();
  if (s === "CBC" || s === "CPC") return "CPC";
  if (s === "CPL" || s === "CPM") return s;
  return "CPM";
}

/** UTC `YYYY-MM-DD` for daily budget rollover (same as Postgres date-at-midnight comparisons in app logic). */
export function utcSpendDayString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function effectiveSpentToday(
  spendDayUtc: string,
  spentToday: Prisma.Decimal,
  now: Date = new Date()
): Prisma.Decimal {
  if (spendDayUtc === utcSpendDayString(now)) return spentToday;
  return ZERO;
}

export function dailyBudgetAllowsCharge(params: {
  dailyBudget: Prisma.Decimal;
  spendDayUtc: string;
  spentToday: Prisma.Decimal;
  amount: Prisma.Decimal;
  now: Date;
}): boolean {
  const { dailyBudget, amount } = params;
  if (dailyBudget.lte(ZERO)) return true;
  const eff = effectiveSpentToday(params.spendDayUtc, params.spentToday, params.now);
  return eff.add(amount).lte(dailyBudget);
}

/** When `bidAmount > 0`, only CPM rows pay on impressions. Legacy (`bidAmount = 0`) keeps impression billing. */
export function shouldChargeImpression(params: { billingType: CampaignBillingType; bidAmount: Prisma.Decimal }): boolean {
  if (params.bidAmount.gt(ZERO)) return params.billingType === "CPM";
  return true;
}

export function impressionUnitCost(params: {
  billingType: CampaignBillingType;
  bidAmount: Prisma.Decimal;
  cpmBid: Prisma.Decimal | null;
}): Prisma.Decimal {
  if (params.bidAmount.gt(ZERO) && params.billingType === "CPM") {
    return params.bidAmount.div(1000);
  }
  if (params.bidAmount.lte(ZERO) && params.cpmBid && params.cpmBid.gt(ZERO)) {
    return params.cpmBid.div(1000);
  }
  const raw = process.env.AD_IMPRESSION_COST ?? "0.01";
  return new Prisma.Decimal(String(raw));
}

export function shouldChargeClick(params: {
  billingType: CampaignBillingType;
  bidAmount: Prisma.Decimal;
  cpcBid: Prisma.Decimal | null;
}): boolean {
  if (params.bidAmount.gt(ZERO)) return params.billingType === "CPC";
  return Boolean(params.cpcBid && params.cpcBid.gt(ZERO));
}

export function clickUnitCost(params: {
  billingType: CampaignBillingType;
  bidAmount: Prisma.Decimal;
  cpcBid: Prisma.Decimal | null;
}): Prisma.Decimal {
  if (params.bidAmount.gt(ZERO) && params.billingType === "CPC") {
    return params.bidAmount;
  }
  if (params.cpcBid && params.cpcBid.gt(ZERO)) {
    return params.cpcBid;
  }
  const raw = process.env.AD_CLICK_COST ?? "0.25";
  const v = new Prisma.Decimal(String(raw));
  return v.gt(ZERO) ? v : ZERO;
}

/** Legacy rows always pay the configured lead fee; explicit CPL pays only when billing is CPL. */
export function shouldChargeLead(params: { billingType: CampaignBillingType; bidAmount: Prisma.Decimal }): boolean {
  if (params.bidAmount.gt(ZERO)) return params.billingType === "CPL";
  return true;
}

export function leadUnitCost(params: {
  billingType: CampaignBillingType;
  bidAmount: Prisma.Decimal;
  cplBid: Prisma.Decimal | null;
}): Prisma.Decimal {
  if (params.bidAmount.gt(ZERO) && params.billingType === "CPL") {
    return params.bidAmount;
  }
  if (params.cplBid && params.cplBid.gt(ZERO)) {
    return params.cplBid;
  }
  return new Prisma.Decimal(String(process.env.AD_LEAD_COST ?? "3"));
}

export type CampaignMonetizationAnalytics = {
  impressions: number;
  clicks: number;
  leads: number;
  spend: number;
  /** spend / clicks */
  cpcActual: number | null;
  /** spend / leads */
  cplActual: number | null;
  /** spend / (impressions/1000) */
  cpmActual: number | null;
  /**
   * Rough “return” proxy: leads * assumed value − spend, divided by spend.
   * Tuned via `AD_ROI_LEAD_VALUE` (decimal string), default 25.
   */
  roiLeadEstimate: number | null;
};

export function buildCampaignMonetizationAnalytics(
  sums: { impressions: number; clicks: number; leads: number; spend: Prisma.Decimal }
): CampaignMonetizationAnalytics {
  const { impressions, clicks, leads } = sums;
  const spend = Number(sums.spend.toString());
  const imprK = impressions / 1000;
  return {
    impressions,
    clicks,
    leads,
    spend,
    cpcActual: clicks > 0 && spend > 0 ? spend / clicks : null,
    cplActual: leads > 0 && spend > 0 ? spend / leads : null,
    cpmActual: imprK > 0 && spend > 0 ? spend / imprK : null,
    roiLeadEstimate: (() => {
      if (spend <= 0) return null;
      const v = Number(process.env.AD_ROI_LEAD_VALUE ?? "25");
      const val = Number.isFinite(v) && v > 0 ? v : 25;
      return (leads * val - spend) / spend;
    })(),
  };
}
