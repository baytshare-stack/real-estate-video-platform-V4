import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { adjustCampaignBudgetAllocation } from "@/lib/ads-platform/billing";
import { validateCampaignActivation } from "@/lib/ads-platform/ad-lifecycle";

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | "DELETED";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });

  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    status?: CampaignStatus;
    budget?: number;
    dailyBudget?: number;
    startDate?: string;
    endDate?: string;
  };

  const existing = await prisma.campaign.findFirst({
    where: { id, advertiserId: auth.profile.id },
    select: { id: true, budget: true, spent: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "ACTIVE") {
    const v = validateCampaignActivation({
      budget: existing.budget,
      spent: existing.spent,
      status: existing.status,
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
    campaign = await prisma.$transaction(async (tx) => {
      const c = await tx.campaign.update({
        where: { id },
        data: { ...rest, status: status ?? body.status },
      });
      if (body.status === "DELETED") {
        await tx.ad.updateMany({ where: { campaignId: id }, data: { status: "DELETED" } });
      } else if (body.status === "ENDED") {
        await tx.ad.updateMany({ where: { campaignId: id }, data: { status: "ENDED" } });
      }
      return c;
    });
  } else if (Object.keys(extra).length > 0) {
    campaign = await prisma.campaign.update({ where: { id }, data: extra });
  }

  if (!campaign) {
    campaign = await prisma.campaign.findUnique({ where: { id } });
  }
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ campaign });
}
