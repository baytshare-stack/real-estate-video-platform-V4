import type { AdCtaType, AdMediaType, AdType, Prisma, VideoAdSlot } from "@prisma/client";
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
  shouldSyncAdTypeOnLegacyPatch,
  syncAdTypeFromSlotAndSkippable,
} from "@/lib/video-ads/resolve-ad-type";

function canSelfServeVideoAds(role: string) {
  return role === "AGENT" || role === "AGENCY";
}

function normalizeCtaType(v: unknown): AdCtaType | undefined {
  const s = String(v || "").toUpperCase();
  if (s === "CALL" || s === "WHATSAPP" || s === "BOOK_VISIT") return s;
  return undefined;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });
  if (!canSelfServeVideoAds(auth.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.ad.findFirst({
    where: { id, publisher: "USER", ownerId: auth.user.id },
    include: { targeting: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await readRequestJson<{
    mediaType?: AdMediaType;
    videoUrl?: string | null;
    imageUrl?: string | null;
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
    campaignId?: string | null;
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

  let nextTarget = existing.targetVideoId;
  if (body.targetVideoId !== undefined) {
    const t = (body.targetVideoId || "").trim() || null;
    if (t) {
      const ok = await userCanTargetVideoForAd(auth.user.id, auth.user.role, t);
      if (!ok) return NextResponse.json({ error: "Invalid target video." }, { status: 403 });
    }
    nextTarget = t;
  }

  const mediaType: AdMediaType = body.mediaType ?? existing.mediaType;
  const data: Prisma.AdUpdateInput = { mediaType };

  if (mediaType === "VIDEO") {
    const mergedUrl =
      body.videoUrl !== undefined ? normalizeAdMediaUrl(body.videoUrl) ?? existing.videoUrl : existing.videoUrl;
    if (!mergedUrl?.trim()) {
      return NextResponse.json({ error: "videoUrl is required for video ads." }, { status: 400 });
    }
    data.videoUrl = mergedUrl;
    data.imageUrl = null;
  } else {
    const mergedImg =
      body.imageUrl !== undefined ? normalizeAdMediaUrl(body.imageUrl) ?? existing.imageUrl : existing.imageUrl;
    if (!mergedImg?.trim()) {
      return NextResponse.json({ error: "imageUrl is required for image ads." }, { status: 400 });
    }
    data.imageUrl = mergedImg;
    data.videoUrl = null;
  }

  if (body.thumbnail !== undefined) data.thumbnail = (body.thumbnail || "").trim() || null;
  if (body.durationSeconds !== undefined) {
    data.durationSeconds =
      typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds)
        ? Math.max(1, Math.round(body.durationSeconds))
        : null;
  }
  const ct = normalizeCtaType(body.ctaType);
  if (ct) data.ctaType = ct;
  if (body.ctaLabel !== undefined) data.ctaLabel = (body.ctaLabel || "").trim() || null;
  if (body.ctaUrl !== undefined) data.ctaUrl = (body.ctaUrl || "").trim() || null;

  const parsedFormat = parseAdTypeInput(body.adType);
  if (parsedFormat) {
    const base = applyAdTypeToSlotAndSkippable(parsedFormat);
    data.type = base.type;
    data.adType = parsedFormat;
    if (parsedFormat === "MID_ROLL") {
      data.skippable = typeof body.skippable === "boolean" ? body.skippable : true;
    } else if (parsedFormat === "PRE_ROLL_NON_SKIPPABLE") {
      data.skippable = false;
    } else if (parsedFormat === "PRE_ROLL_SKIPPABLE") {
      data.skippable = body.skippable !== false;
    } else {
      data.skippable = base.skippable;
    }
  } else {
    if (body.type === "PRE_ROLL" || body.type === "MID_ROLL") data.type = body.type;
    if (typeof body.skippable === "boolean") data.skippable = body.skippable;
    if (shouldSyncAdTypeOnLegacyPatch(existing, body)) {
      const mergedType = (data.type as VideoAdSlot | undefined) ?? existing.type;
      const mergedSkip =
        typeof data.skippable === "boolean" ? data.skippable : existing.skippable;
      data.adType = syncAdTypeFromSlotAndSkippable(mergedType, mergedSkip);
    }
  }
  if (typeof body.skipAfterSeconds === "number" && Number.isFinite(body.skipAfterSeconds)) {
    data.skipAfterSeconds = Math.max(0, body.skipAfterSeconds);
  }
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.targetVideoId !== undefined) {
    data.targetVideo = nextTarget ? { connect: { id: nextTarget } } : { disconnect: true };
  }
  if (body.campaignId !== undefined) {
    const cid = (body.campaignId || "").trim();
    if (!cid) {
      data.campaign = { disconnect: true };
    } else {
      const camp = await prisma.campaign.findFirst({
        where: { id: cid, advertiserId: auth.profile.id },
      });
      if (!camp) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
      data.campaign = { connect: { id: cid } };
    }
  }

  if (body.targeting) {
    const countries = parseStringList(body.targeting.countries);
    const cities = parseStringList(body.targeting.cities);
    const propertyTypes = parseStringList(body.targeting.propertyTypes);
    const priceMin = parseOptionalDecimal(body.targeting.priceMin);
    const priceMax = parseOptionalDecimal(body.targeting.priceMax);
    const userIntent = parseUserIntent(body.targeting.userIntent);
    data.targeting = {
      upsert: {
        create: { countries, cities, propertyTypes, priceMin, priceMax, userIntent },
        update: { countries, cities, propertyTypes, priceMin, priceMax, userIntent },
      },
    };
  }

  const ad = await prisma.ad.update({ where: { id }, data });
  return NextResponse.json({ ad });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.ad.findFirst({
    where: { id, publisher: "USER", ownerId: auth.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ad.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
