import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { readRequestJson } from "@/lib/ads-client/safe-json";
import { createCampaignWithWalletAllocation } from "@/lib/ads-platform/billing";

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
  return NextResponse.json({ success: true, campaigns });
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

  try {
    const { campaign } = await createCampaignWithWalletAllocation({
      userId: auth.user.id,
      advertiserProfileId: auth.profile.id,
      name,
      budget,
      dailyBudget,
      startDate,
      endDate,
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
