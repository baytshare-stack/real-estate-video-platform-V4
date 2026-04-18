import { NextResponse } from "next/server";
import type { AdCreativeKind, AdTextDisplayMode, VideoAdSlot } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeAdMediaUrl, normalizeAdTextBody } from "@/lib/ads-platform/media-url";

export async function GET() {
  try {
    const [ads, campaigns] = await Promise.all([
      prisma.ad.findMany({
        where: { publisher: "ADMIN" },
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
        creativeKind: a.creativeKind,
        videoUrl: a.videoUrl,
        textBody: a.textBody,
        textDisplayMode: a.textDisplayMode,
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
  creativeKind?: AdCreativeKind;
  videoUrl?: string | null;
  textBody?: string | null;
  textDisplayMode?: AdTextDisplayMode | null;
  type?: VideoAdSlot;
  skippable?: boolean;
  skipAfterSeconds?: number;
  active?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBody;
    const kind: AdCreativeKind = body.creativeKind === "TEXT" ? "TEXT" : "VIDEO";
    const type = body.type === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL";
    const skippable = body.skippable !== false;
    const skipAfterSeconds = Math.max(0, Number(body.skipAfterSeconds ?? 5) || 5);
    const active = body.active !== false;

    let videoUrl: string | null = null;
    let textBody: string | null = null;
    let textDisplayMode: AdTextDisplayMode | null = null;

    if (kind === "VIDEO") {
      videoUrl = normalizeAdMediaUrl(body.videoUrl);
      if (!videoUrl) {
        return NextResponse.json({ error: "videoUrl is required for video ads." }, { status: 400 });
      }
    } else {
      textBody = normalizeAdTextBody(body.textBody);
      if (!textBody) {
        return NextResponse.json({ error: "textBody is required for text ads." }, { status: 400 });
      }
      textDisplayMode = body.textDisplayMode === "CARD" ? "CARD" : "OVERLAY";
    }

    const ad = await prisma.ad.create({
      data: {
        publisher: "ADMIN",
        creativeKind: kind,
        videoUrl,
        textBody,
        textDisplayMode,
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
