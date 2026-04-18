import type { AdCtaType, AdMediaType, AdType, VideoAdSlot } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { readRequestJson } from "@/lib/ads-client/safe-json";
import { normalizeAdMediaUrl } from "@/lib/ads-platform/media-url";
import { parseOptionalDecimal, parseStringList, parseUserIntent } from "@/lib/ads-platform/targeting-body";
import { userCanTargetVideoForAd } from "@/lib/video-ads/targeting";
import {
  applyAdTypeToSlotAndSkippable,
  parseAdTypeInput,
  syncAdTypeFromSlotAndSkippable,
} from "@/lib/video-ads/resolve-ad-type";

function canSelfServeVideoAds(role: string) {
  return role === "AGENT" || role === "AGENCY";
}

function normalizeCtaType(v: unknown): AdCtaType {
  const s = String(v || "").toUpperCase();
  if (s === "CALL" || s === "BOOK_VISIT") return s;
  return "WHATSAPP";
}

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) {
    return NextResponse.json({
      success: true,
      ads: [],
      notice: "Complete advertiser onboarding to create video ads.",
    });
  }
  if (!canSelfServeVideoAds(auth.user.role)) {
    return NextResponse.json({
      success: true,
      ads: [],
      notice: "Video promotions are available for agent and agency accounts.",
    });
  }

  const ads = await prisma.ad.findMany({
    where: { publisher: "USER", ownerId: auth.user.id },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      campaign: { select: { id: true, name: true, status: true } },
      targeting: true,
      performance: true,
    },
  });

  return NextResponse.json({
    success: true,
    ads: ads.map((a) => ({
      id: a.id,
      publisher: a.publisher,
      mediaType: a.mediaType,
      videoUrl: a.videoUrl,
      imageUrl: a.imageUrl,
      thumbnail: a.thumbnail,
      durationSeconds: a.durationSeconds,
      ctaType: a.ctaType,
      ctaLabel: a.ctaLabel,
      ctaUrl: a.ctaUrl,
      type: a.type,
      adType: a.adType,
      skippable: a.skippable,
      skipAfterSeconds: a.skipAfterSeconds,
      active: a.active,
      adminReviewStatus: a.adminReviewStatus,
      targetVideoId: a.targetVideoId,
      campaignId: a.campaignId,
      campaign: a.campaign,
      targeting: a.targeting,
      performance: a.performance,
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

  const body = await readRequestJson<{
    campaignId?: string;
    mediaType?: AdMediaType;
    videoUrl?: string;
    imageUrl?: string;
    thumbnail?: string | null;
    durationSeconds?: number | null;
    ctaType?: AdCtaType;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    type?: VideoAdSlot;
    adType?: AdType | string;
    targetVideoId?: string | null;
    skippable?: boolean;
    skipAfterSeconds?: number;
    active?: boolean;
    targeting?: {
      countries?: unknown;
      cities?: unknown;
      propertyTypes?: unknown;
      priceMin?: unknown;
      priceMax?: unknown;
      userIntent?: unknown;
    };
  }>(req);
  if (!body) return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });

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

  const mediaType: AdMediaType = body.mediaType === "IMAGE" ? "IMAGE" : "VIDEO";
  const videoUrl = mediaType === "VIDEO" ? normalizeAdMediaUrl(body.videoUrl) : null;
  const imageUrl = mediaType === "IMAGE" ? normalizeAdMediaUrl(body.imageUrl) : null;
  if (mediaType === "VIDEO" && !videoUrl) {
    return NextResponse.json({ error: "videoUrl is required for video ads." }, { status: 400 });
  }
  if (mediaType === "IMAGE" && !imageUrl) {
    return NextResponse.json({ error: "imageUrl is required for image ads." }, { status: 400 });
  }

  const parsedFormat = parseAdTypeInput(body.adType);
  let slot: VideoAdSlot;
  let skippable: boolean;
  let adType: AdType;

  if (parsedFormat) {
    const base = applyAdTypeToSlotAndSkippable(parsedFormat);
    slot = base.type;
    adType = parsedFormat;
    if (parsedFormat === "MID_ROLL") {
      skippable = typeof body.skippable === "boolean" ? body.skippable : base.skippable;
    } else if (parsedFormat === "PRE_ROLL_NON_SKIPPABLE") {
      skippable = false;
    } else if (parsedFormat === "PRE_ROLL_SKIPPABLE") {
      skippable = body.skippable !== false;
    } else {
      skippable = base.skippable;
    }
  } else {
    slot = body.type === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL";
    skippable = body.skippable !== false;
    adType = syncAdTypeFromSlotAndSkippable(slot, skippable);
  }
  const targetVideoId = (body.targetVideoId || "").trim() || null;

  if (targetVideoId) {
    const ok = await userCanTargetVideoForAd(auth.user.id, auth.user.role, targetVideoId);
    if (!ok) return NextResponse.json({ error: "You can only promote your own listings." }, { status: 403 });
  }

  const t = body.targeting;
  const countries = parseStringList(t?.countries);
  const cities = parseStringList(t?.cities);
  const propertyTypes = parseStringList(t?.propertyTypes);
  const priceMin = parseOptionalDecimal(t?.priceMin);
  const priceMax = parseOptionalDecimal(t?.priceMax);
  const userIntent = parseUserIntent(t?.userIntent);

  const ctaType = normalizeCtaType(body.ctaType);
  const ctaLabel = (body.ctaLabel || "").trim() || "احصل على السعر النهائي";
  const ctaUrl = (body.ctaUrl || "").trim() || null;
  const thumbnail = (body.thumbnail || "").trim() || null;
  const durationSeconds =
    typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds)
      ? Math.max(1, Math.round(body.durationSeconds))
      : mediaType === "IMAGE"
        ? 8
        : null;

  const ad = await prisma.ad.create({
    data: {
      publisher: "USER",
      ownerId: auth.user.id,
      campaignId: campaign.id,
      targetVideoId,
      mediaType,
      videoUrl,
      imageUrl,
      thumbnail: thumbnail || null,
      durationSeconds,
      ctaType,
      ctaLabel,
      ctaUrl,
      type: slot,
      adType,
      skippable,
      skipAfterSeconds: Math.max(0, Number(body.skipAfterSeconds ?? 5) || 5),
      active: body.active !== false,
      adminReviewStatus: "PENDING",
      targeting: {
        create: {
          countries,
          cities,
          propertyTypes,
          priceMin,
          priceMax,
          userIntent,
        },
      },
      performance: { create: {} },
    },
  });

  return NextResponse.json({ ad });
}
