import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { readRequestJson } from "@/lib/ads-client/safe-json";
import { adjustCampaignBudgetAllocation, bidFieldSync } from "@/lib/ads-platform/billing";
import { parseBillingTypeInput, utcSpendDayString } from "@/lib/ads-platform/monetization-engine";

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | "DELETED";

const ZERO = new Prisma.Decimal(0);

function parseMoneyField(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function validateCampaignActivation(c: {
  budget: Prisma.Decimal;
  spent: Prisma.Decimal;
  status: string;
  dailyBudget: Prisma.Decimal;
  spentToday: Prisma.Decimal;
  spendDayUtc: string;
}): { ok: true } | { ok: false; error: string } {
  if (c.status === "DELETED") return { ok: false, error: "Cannot activate a deleted campaign." };
  if (c.budget.lte(ZERO)) return { ok: false, error: "Campaign budget must be greater than zero." };
  if (c.budget.sub(c.spent).lte(ZERO)) {
    return { ok: false, error: "No remaining campaign budget. Add budget or recharge wallet." };
  }
  if (c.dailyBudget.gt(ZERO)) {
    const spent =
      c.spendDayUtc === utcSpendDayString(new Date()) ? c.spentToday : ZERO;
    if (spent.gte(c.dailyBudget)) {
      return {
        ok: false,
        error: "Daily budget cap already reached for today. Raise the daily cap or wait until tomorrow (UTC).",
      };
    }
  }
  return { ok: true };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });

  const { id } = await params;
  const body = await readRequestJson<{
    name?: string;
    status?: CampaignStatus;
    budget?: number;
    dailyBudget?: number;
    startDate?: string;
    endDate?: string;
    billingType?: string;
    bidAmount?: number | string;
  }>(req);
  if (!body) return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });

  const existing = await prisma.campaign.findFirst({
    where: { id, advertiserId: auth.profile.id },
    select: {
      id: true,
      budget: true,
      spent: true,
      status: true,
      dailyBudget: true,
      spentToday: true,
      spendDayUtc: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "ACTIVE") {
    const v = validateCampaignActivation({
      budget: existing.budget,
      spent: existing.spent,
      status: existing.status,
      dailyBudget: existing.dailyBudget,
      spentToday: existing.spentToday,
      spendDayUtc: existing.spendDayUtc,
    });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  }

  let campaign = null as Awaited<ReturnType<typeof prisma.campaign.findUnique>>;

  if (typeof body.budget === "number") {
    if (!Number.isFinite(body.budget) || body.budget <= 0) {
      return NextResponse.json({ error: "budget must be > 0" }, { status: 400 });
    }
    try {
      campaign = await adjustCampaignBudgetAllocation({
        userId: auth.user.id,
        advertiserProfileId: auth.profile.id,
        campaignId: id,
        newBudget: new Prisma.Decimal(String(body.budget)),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "INSUFFICIENT_WALLET") {
        return NextResponse.json({ error: "Insufficient wallet balance for budget increase." }, { status: 400 });
      }
      if (msg === "BUDGET_BELOW_SPENT") {
        return NextResponse.json({ error: "Budget cannot be less than amount already spent." }, { status: 400 });
      }
      console.error("adjust campaign budget", e);
      return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
    }
  }

  const extra: Prisma.CampaignUpdateInput = {};
  if (typeof body.name === "string") extra.name = body.name;
  if (body.status) extra.status = body.status;
  if (typeof body.dailyBudget === "number" && Number.isFinite(body.dailyBudget) && body.dailyBudget >= 0) {
    extra.dailyBudget = body.dailyBudget;
  }
  if (body.startDate) extra.startDate = new Date(body.startDate);
  if (body.endDate) extra.endDate = new Date(body.endDate);

  if (body.status === "DELETED" || body.status === "ENDED") {
    const { status, ...rest } = extra;
    campaign = await prisma.campaign.update({
      where: { id },
      data: { ...rest, status: status ?? body.status },
    });
  } else if (Object.keys(extra).length > 0) {
    campaign = await prisma.campaign.update({ where: { id }, data: extra });
  }

  const wantsMonetizationFields =
    typeof body.billingType === "string" ||
    typeof body.bidAmount === "number" ||
    (typeof body.bidAmount === "string" && body.bidAmount.trim() !== "");

  if (wantsMonetizationFields) {
    const cur = await prisma.campaign.findFirst({
      where: { id, advertiserId: auth.profile.id },
      select: { billingType: true, bidAmount: true },
    });
    if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const bt =
      typeof body.billingType === "string" ? parseBillingTypeInput(body.billingType) : cur.billingType;
    let bidDec = cur.bidAmount;
    if (typeof body.bidAmount === "number" && Number.isFinite(body.bidAmount)) {
      bidDec = new Prisma.Decimal(String(Math.max(0, body.bidAmount)));
    } else if (typeof body.bidAmount === "string") {
      const n = parseMoneyField(body.bidAmount);
      if (n != null) bidDec = new Prisma.Decimal(String(Math.max(0, n)));
    }
    campaign = await prisma.campaign.update({
      where: { id },
      data: bidFieldSync(bt, bidDec),
    });
  }

  if (!campaign) {
    campaign = await prisma.campaign.findUnique({ where: { id } });
  }
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ campaign });
}
