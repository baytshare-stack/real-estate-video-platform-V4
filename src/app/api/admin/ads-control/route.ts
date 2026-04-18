import type { AdAdminReviewStatus, AdPublisher, CampaignStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

export const runtime = "nodejs";

function parsePublisher(v: string | null): AdPublisher | undefined {
  if (v === "USER" || v === "ADMIN") return v;
  return undefined;
}

function parseReview(v: string | null): AdAdminReviewStatus | undefined {
  if (v === "PENDING" || v === "APPROVED" || v === "REJECTED") return v;
  return undefined;
}

export async function GET(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const publisher = parsePublisher(searchParams.get("publisher"));
    const review = parseReview(searchParams.get("review"));
    const q = (searchParams.get("q") || "").trim();
    const campaignStatus = (searchParams.get("campaignStatus") || "").trim();
    const minImpr = Math.max(0, Number(searchParams.get("minImpr") || "") || 0);

    const where: Prisma.AdWhereInput = {};
    if (publisher) where.publisher = publisher;
    if (review) where.adminReviewStatus = review;
    if (q) {
      where.OR = [
        { owner: { email: { contains: q, mode: "insensitive" } } },
        { owner: { fullName: { contains: q, mode: "insensitive" } } },
        { campaign: { name: { contains: q, mode: "insensitive" } } },
        { id: { contains: q } },
      ];
    }
    if (campaignStatus && ["DRAFT", "ACTIVE", "PAUSED", "ENDED", "DELETED"].includes(campaignStatus)) {
      where.campaign = { status: campaignStatus as CampaignStatus };
    }

    const ads = await prisma.ad.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 500,
      include: {
        owner: { select: { id: true, email: true, fullName: true, isBlocked: true, role: true } },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
            budget: true,
            spent: true,
            dailyBudget: true,
            startDate: true,
            endDate: true,
          },
        },
        performance: true,
        targeting: true,
      },
    });

    const filtered =
      minImpr > 0 ? ads.filter((a) => (a.performance?.impressions ?? 0) >= minImpr) : ads;

    return NextResponse.json({
      ads: filtered.map((a) => ({
        id: a.id,
        publisher: a.publisher,
        ownerId: a.ownerId,
        owner: a.owner,
        campaignId: a.campaignId,
        campaign: a.campaign
          ? {
              ...a.campaign,
              budget: a.campaign.budget.toString(),
              spent: a.campaign.spent.toString(),
              dailyBudget: a.campaign.dailyBudget.toString(),
              startDate: a.campaign.startDate.toISOString(),
              endDate: a.campaign.endDate.toISOString(),
            }
          : null,
        mediaType: a.mediaType,
        videoUrl: a.videoUrl,
        imageUrl: a.imageUrl,
        type: a.type,
        active: a.active,
        adminReviewStatus: a.adminReviewStatus,
        skippable: a.skippable,
        skipAfterSeconds: a.skipAfterSeconds,
        performance: a.performance,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("admin ads-control GET", e);
    return NextResponse.json({ error: "Failed to load ads." }, { status: 500 });
  }
}
