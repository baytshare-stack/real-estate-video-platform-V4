import { NextResponse } from "next/server";
import type { VideoAdSlot } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { normalizeAdMediaUrl } from "@/lib/ads-platform/media-url";
import { userCanTargetVideoForAd } from "@/lib/video-ads/targeting";

function canSelfServeVideoAds(role: string) {
  return role === "AGENT" || role === "AGENCY";
}

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) {
    return NextResponse.json({
      ads: [],
      notice: "Complete advertiser onboarding to create video ads.",
    });
  }
  if (!canSelfServeVideoAds(auth.user.role)) {
    return NextResponse.json({
      ads: [],
      notice: "Video promotions are available for agent and agency accounts.",
    });
  }

  const ads = await prisma.ad.findMany({
    where: { publisher: "USER", ownerId: auth.user.id },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { campaign: { select: { id: true, name: true, status: true } } },
  });

  return NextResponse.json({
    ads: ads.map((a) => ({
      id: a.id,
      publisher: a.publisher,
      videoUrl: a.videoUrl,
      type: a.type,
      skippable: a.skippable,
      skipAfterSeconds: a.skipAfterSeconds,
      active: a.active,
      targetVideoId: a.targetVideoId,
      campaignId: a.campaignId,
      campaign: a.campaign,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });
  if (!canSelfServeVideoAds(auth.user.role)) {
    return NextResponse.json({ error: "Only agents and agencies can create video ads." }, { status: 403 });
  }

  const body = (await req.json()) as {
    campaignId?: string;
    videoUrl?: string;
    type?: VideoAdSlot;
    targetVideoId?: string | null;
    skippable?: boolean;
    skipAfterSeconds?: number;
    active?: boolean;
  };

  const campaignId = (body.campaignId || "").trim();
  if (!campaignId) return NextResponse.json({ error: "campaignId is required." }, { status: 400 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, advertiserId: auth.profile.id },
    select: { id: true, status: true },
  });
  if (!campaign) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  if (campaign.status === "DELETED") {
    return NextResponse.json({ error: "Cannot attach ads to a deleted campaign." }, { status: 400 });
  }

  const videoUrl = normalizeAdMediaUrl(body.videoUrl);
  if (!videoUrl) return NextResponse.json({ error: "videoUrl is required." }, { status: 400 });

  const slot = body.type === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL";
  const targetVideoId = (body.targetVideoId || "").trim() || null;

  if (targetVideoId) {
    const ok = await userCanTargetVideoForAd(auth.user.id, auth.user.role, targetVideoId);
    if (!ok) return NextResponse.json({ error: "You can only promote your own listings." }, { status: 403 });
  }

  const ad = await prisma.ad.create({
    data: {
      publisher: "USER",
      ownerId: auth.user.id,
      campaignId: campaign.id,
      targetVideoId,
      videoUrl,
      type: slot,
      skippable: body.skippable !== false,
      skipAfterSeconds: Math.max(0, Number(body.skipAfterSeconds ?? 5) || 5),
      active: body.active !== false,
    },
  });

  return NextResponse.json({ ad });
}
