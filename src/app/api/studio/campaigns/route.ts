import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { createCampaignWithWalletAllocation } from "@/lib/ads-platform/billing";

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ campaigns: [] });

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId: auth.profile.id },
    include: { _count: { select: { ads: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });

  const body = (await req.json()) as {
    name?: string;
    budget?: number;
    dailyBudget?: number;
    startDate?: string;
    endDate?: string;
  };

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const budgetNum = Number(body.budget);
  const dailyNum = Number(body.dailyBudget ?? 0);
  if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
    return NextResponse.json({ error: "budget must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(dailyNum) || dailyNum < 0) {
    return NextResponse.json({ error: "dailyBudget must be >= 0" }, { status: 400 });
  }

  const budget = new Prisma.Decimal(String(budgetNum));
  const dailyBudget = new Prisma.Decimal(String(dailyNum));
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const endDate = body.endDate ? new Date(body.endDate) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

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
    return NextResponse.json({ campaign });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INSUFFICIENT_WALLET") {
      return NextResponse.json(
        { error: "Insufficient wallet balance. Add funds before allocating campaign budget." },
        { status: 400 }
      );
    }
    console.error("create campaign", e);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
