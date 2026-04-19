import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { readRequestJson } from "@/lib/ads-client/safe-json";
import { createCampaignWithWalletAllocation } from "@/lib/ads-platform/billing";
import {
  buildCampaignMonetizationAnalytics,
  computeAutoBidForCampaign,
  parseStrictStudioBillingModel,
} from "@/lib/ads-platform/monetization-engine";

const ZERO = new Prisma.Decimal(0);
const LOG = "[api/studio/campaigns POST]";
const isDev = process.env.NODE_ENV === "development";

function parseMoneyField(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Coerce parsed money to a finite Number (avoids string/boxed types from JSON). */
function asMoneyNumber(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Number(n);
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
  }>(req);
  if (!body) {
    console.warn(LOG, "validation: missing or invalid JSON body");
    return NextResponse.json({ success: false, error: "Valid JSON body is required." }, { status: 400 });
  }

  console.info(LOG, "request payload", JSON.stringify(body));

  const name = String(body.name || "").trim();
  if (!name) {
    console.warn(LOG, "validation: name missing or empty");
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const budgetNum = asMoneyNumber(parseMoneyField(body.budget));
  const dailyRaw = body.dailyBudget;
  const dailyParsed =
    dailyRaw === undefined || dailyRaw === null || dailyRaw === ""
      ? 0
      : parseMoneyField(dailyRaw);
  const dailyNum = Number(dailyParsed ?? 0);

  if (budgetNum == null || budgetNum <= 0) {
    console.warn(LOG, "validation: budget invalid", { budget: body.budget, budgetNum });
    return NextResponse.json(
      { success: false, error: "budget must be a positive number" },
      { status: 400 }
    );
  }
  if (dailyNum < 0 || !Number.isFinite(dailyNum)) {
    console.warn(LOG, "validation: dailyBudget invalid", { dailyBudget: body.dailyBudget, dailyNum });
    return NextResponse.json(
      { success: false, error: "dailyBudget must be a number >= 0" },
      { status: 400 }
    );
  }
  if (dailyNum > budgetNum) {
    console.warn(LOG, "validation: daily exceeds total", { dailyNum, budgetNum });
    return NextResponse.json(
      {
        success: false,
        error: "Daily budget cannot exceed the total campaign budget.",
      },
      { status: 400 }
    );
  }

  const budget = new Prisma.Decimal(String(Number(budgetNum)));
  const dailyBudget = new Prisma.Decimal(String(Number(dailyNum)));
  const startDate = parseOptionalDateField(body.startDate) ?? new Date();
  const endDate = parseOptionalDateField(body.endDate) ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    console.warn(LOG, "validation: bad dates", { startDate: body.startDate, endDate: body.endDate });
    return NextResponse.json(
      { success: false, error: "Invalid startDate or endDate." },
      { status: 400 }
    );
  }
  if (endDate.getTime() <= startDate.getTime()) {
    console.warn(LOG, "validation: end before start", { startDate: body.startDate, endDate: body.endDate });
    return NextResponse.json(
      { success: false, error: "endDate must be after startDate." },
      { status: 400 }
    );
  }

  const billingRaw =
    body.billingType === undefined || body.billingType === null || String(body.billingType).trim() === ""
      ? "CPM"
      : body.billingType;
  const billingParsed = parseStrictStudioBillingModel(billingRaw);
  if (!billingParsed.ok) {
    console.warn(LOG, "validation: billingType", billingParsed.error, { billingType: body.billingType });
    return NextResponse.json({ success: false, error: billingParsed.error }, { status: 400 });
  }
  const billingType = billingParsed.prisma;
  const bidAmount = computeAutoBidForCampaign({
    billingType,
    budget,
    dailyBudget,
    startDate,
    endDate,
  });

  console.info(LOG, "resolved create", {
    name,
    budgetNum,
    dailyNum,
    billingType,
    autoBid: bidAmount.toString(),
  });

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
      console.warn(LOG, "wallet insufficient for allocation", { userId: auth.user.id });
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient wallet balance. Add funds in Billing before allocating this campaign budget.",
        },
        { status: 400 }
      );
    }
    console.error(LOG, "create campaign failed", e);

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(LOG, "Prisma known error", { code: e.code, meta: e.meta, message: e.message });
      return NextResponse.json(
        {
          success: false,
          error: isDev ? e.message : "Could not save campaign. Please try again.",
          ...(isDev ? { prismaCode: e.code, prismaMeta: e.meta } : { code: e.code }),
        },
        { status: 500 }
      );
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
      console.error(LOG, "Prisma validation error", e.message);
      return NextResponse.json(
        {
          success: false,
          error: isDev ? e.message : "Could not save campaign. Please try again.",
        },
        { status: 500 }
      );
    }

    const fallback =
      e instanceof Error && e.message && e.message !== "Failed to create campaign"
        ? e.message
        : "Failed to create campaign";
    return NextResponse.json(
      { success: false, error: isDev ? fallback : "Could not save campaign. Please try again." },
      { status: 500 }
    );
  }
}
