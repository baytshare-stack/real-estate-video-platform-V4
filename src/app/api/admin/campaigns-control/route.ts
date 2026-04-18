import type { CampaignStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "").trim();
    const q = (searchParams.get("q") || "").trim();
    const minSpent = Math.max(0, Number(searchParams.get("minSpent") || "") || 0);

    const where: Prisma.CampaignWhereInput = {};
    if (status && ["DRAFT", "ACTIVE", "PAUSED", "ENDED", "DELETED"].includes(status)) {
      where.status = status as CampaignStatus;
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { advertiser: { businessName: { contains: q, mode: "insensitive" } } },
        { id: { contains: q } },
      ];
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 500,
      include: {
        advertiser: {
          select: {
            id: true,
            businessName: true,
            userId: true,
            user: { select: { email: true, fullName: true, isBlocked: true } },
          },
        },
        _count: { select: { ads: true } },
      },
    });

    const filtered =
      minSpent > 0
        ? campaigns.filter((c) => Number(c.spent) >= minSpent)
        : campaigns;

    return NextResponse.json({
      campaigns: filtered.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        budget: c.budget.toString(),
        dailyBudget: c.dailyBudget.toString(),
        spent: c.spent.toString(),
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        bidWeight: c.bidWeight,
        adsCount: c._count.ads,
        advertiser: c.advertiser,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("admin campaigns-control GET", e);
    return NextResponse.json({ error: "Failed to load campaigns." }, { status: 500 });
  }
}
