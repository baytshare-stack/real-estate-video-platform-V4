import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { readRequestJson } from "@/lib/ads-client/safe-json";
import { createCampaignWithWalletAllocation } from "@/lib/ads-platform/billing";
import { buildCampaignMonetizationAnalytics } from "@/lib/ads-platform/monetization-engine";

const ZERO = new Prisma.Decimal(0);

function parseBillingType(v: unknown): CampaignBillingType {
  const s = String(v ?? "CPM").toUpperCase();
  if (s === "CPC" || s === "CPL" || s === "CPM") return s;
  return "CPM";
}

function parseMoneyField(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseOptionalDateField(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ success: true, campaigns: [] });

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId: auth.profile.id },
    orderBy: { createdAt: "desc" },
  });
  const ids = campaigns.map((c) => c.id);
  const sums = new Map<string, { impressions: number; clicks: number; leads: number; spend: Prisma.Decimal }>();
  for (const id of ids) {
    sums.set(id, { impressions: 0, clicks: 0, leads: 0, spend: ZERO });
  }
  if (ids.length) {
    const rows = await prisma.ad.findMany({
      where: { campaignId: { in: ids } },
      select: {
        campaignId: true,
        performance: { select: { impressions: true, clicks: true, leads: true, spend: true } },
      },
    });
    for (const r of rows) {
      if (!r.campaignId) continue;
      const acc = sums.get(r.campaignId)!;
      const p = r.performance;
      acc.impressions += p?.impressions ?? 0;
      acc.clicks += p?.clicks ?? 0;
      acc.leads += p?.leads ?? 0;
      acc.spend = acc.spend.add(p?.spend ?? ZERO);
    }
  }
  const campaignsOut = campaigns.map((c) => ({
    ...c,
    monetization: buildCampaignMonetizationAnalytics(sums.get(c.id) ?? { impressions: 0, clicks: 0, leads: 0, spend: ZERO }),
  }));

  return NextResponse.json({ success: true, campaigns: campaignsOut });
}

export async function POST(req: Request) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!auth.profile) {
    return NextResponse.json(
      { success: false, error: "Advertiser onboarding required" },
      { status: 400 }
    );
  }

  const body = await readRequestJson<{
    name?: string;
    budget?: number | string;
    dailyBudget?: number | string;
    startDate?: string;
    endDate?: string;
    billingType?: string;
    bidAmount?: number | string;
  }>(req);
  if (!body) {
    return NextResponse.json({ success: false, error: "Valid JSON body is required." }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const budgetNum = parseMoneyField(body.budget);
  const dailyRaw = body.dailyBudget;
  const dailyNum =
    dailyRaw === undefined || dailyRaw === null || dailyRaw === ""
      ? 0
      : (parseMoneyField(dailyRaw) ?? 0);
  if (budgetNum == null || budgetNum <= 0) {
    return NextResponse.json(
      { success: false, error: "budget must be a positive number" },
      { status: 400 }
    );
  }
  if (dailyNum < 0 || !Number.isFinite(dailyNum)) {
    return NextResponse.json(
      { success: false, error: "dailyBudget must be a number >= 0" },
      { status: 400 }
    );
  }
  if (dailyNum > budgetNum) {
    return NextResponse.json(
      {
        success: false,
        error: "Daily budget cannot exceed the total campaign budget.",
      },
      { status: 400 }
    );
  }

  const budget = new Prisma.Decimal(String(budgetNum));
  const dailyBudget = new Prisma.Decimal(String(dailyNum));
  const startDate = parseOptionalDateField(body.startDate) ?? new Date();
  const endDate = parseOptionalDateField(body.endDate) ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json(
      { success: false, error: "Invalid startDate or endDate." },
      { status: 400 }
    );
  }
  if (endDate.getTime() <= startDate.getTime()) {
    return NextResponse.json(
      { success: false, error: "endDate must be after startDate." },
      { status: 400 }
    );
  }

  const billingType = parseBillingTypeInput(body.billingType);
  const bidAmtParsed = parseMoneyField(body.bidAmount);
  const bidAmount =
    bidAmtParsed != null && bidAmtParsed > 0 ? new Prisma.Decimal(String(bidAmtParsed)) : ZERO;
  if (bidAmtParsed != null && bidAmtParsed < 0) {
    return NextResponse.json({ success: false, error: "bidAmount must be >= 0" }, { status: 400 });
  }
  if ((billingType === "CPC" || billingType === "CPL") && bidAmount.lte(ZERO)) {
    return NextResponse.json(
      { success: false, error: "CPC and CPL campaigns require a positive bidAmount." },
      { status: 400 }
    );
  }

  try {
    const { campaign } = await createCampaignWithWalletAllocation({
      userId: auth.user.id,
      advertiserProfileId: auth.profile.id,
      name,
      budget,
      dailyBudget,
      startDate,
      endDate,
      billingType,
      bidAmount,
    });
    return NextResponse.json({ success: true, campaign });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INSUFFICIENT_WALLET") {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient wallet balance. Add funds in Billing before allocating this campaign budget.",
        },
        { status: 400 }
      );
    }
    console.error("create campaign failed", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not save campaign. Please try again.",
          code: e.code,
        },
        { status: 500 }
      );
    }
    const fallback =
      e instanceof Error && e.message && e.message !== "Failed to create campaign"
        ? e.message
        : "Failed to create campaign";
    return NextResponse.json({ success: false, error: fallback }, { status: 500 });
  }
}
