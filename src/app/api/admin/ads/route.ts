import { NextResponse } from "next/server";
import type { VideoAdSlot } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeAdMediaUrl } from "@/lib/ads-platform/media-url";

export async function GET() {
  try {
    const [ads, campaigns] = await Promise.all([
      prisma.ad.findMany({
        orderBy: { updatedAt: "desc" },
        take: 500,
      }),
      prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          name: true,
          status: true,
          budget: true,
          dailyBudget: true,
          spent: true,
          bidWeight: true,
          startDate: true,
          endDate: true,
          advertiser: { select: { businessName: true } },
        },
      }),
    ]);

    return NextResponse.json({
      ads: ads.map((a) => ({
        id: a.id,
        publisher: a.publisher,
        ownerId: a.ownerId,
        targetVideoId: a.targetVideoId,
        campaignId: a.campaignId,
        videoUrl: a.videoUrl,
        type: a.type,
        skippable: a.skippable,
        skipAfterSeconds: a.skipAfterSeconds,
        active: a.active,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        budget: c.budget.toString(),
        dailyBudget: c.dailyBudget.toString(),
        spent: c.spent.toString(),
        bidWeight: c.bidWeight,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        advertiserName: c.advertiser.businessName,
      })),
    });
  } catch (e) {
    console.error("admin ads GET", e);
    return NextResponse.json({ error: "Failed to load ads." }, { status: 500 });
  }
}

type CreateBody = {
  videoUrl?: string | null;
  type?: VideoAdSlot;
  skippable?: boolean;
  skipAfterSeconds?: number;
  active?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBody;
    const videoUrl = normalizeAdMediaUrl(body.videoUrl);
    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required." }, { status: 400 });
    }
    const type = body.type === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL";
    const skippable = body.skippable !== false;
    const skipAfterSeconds = Math.max(0, Number(body.skipAfterSeconds ?? 5) || 5);
    const active = body.active !== false;

    const ad = await prisma.ad.create({
      data: {
        publisher: "ADMIN",
        videoUrl,
        type,
        skippable,
        skipAfterSeconds,
        active,
      },
    });

    return NextResponse.json({ ad });
  } catch (e) {
    console.error("admin ads POST", e);
    return NextResponse.json({ error: "Failed to create ad." }, { status: 500 });
  }
}
