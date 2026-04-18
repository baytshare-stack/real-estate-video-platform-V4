import type { Prisma } from "@prisma/client";
import type { AdCtaType, AdMediaType, AdType, VideoAdSlot } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeAdMediaUrl } from "@/lib/ads-platform/media-url";
import { parseOptionalDecimal, parseStringList, parseUserIntent } from "@/lib/ads-platform/targeting-body";
import {
  applyAdTypeToSlotAndSkippable,
  parseAdTypeInput,
  shouldSyncAdTypeOnLegacyPatch,
  syncAdTypeFromSlotAndSkippable,
} from "@/lib/video-ads/resolve-ad-type";

type PatchBody = {
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
};

function normalizeCtaType(v: unknown): AdCtaType | undefined {
  const s = String(v || "").toUpperCase();
  if (s === "CALL" || s === "WHATSAPP" || s === "BOOK_VISIT") return s;
  return undefined;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }
    if (existing.publisher !== "ADMIN") {
      return NextResponse.json({ error: "Only platform (admin) ads can be edited here." }, { status: 403 });
    }

    const body = (await req.json()) as PatchBody;

    const adData: Prisma.AdUpdateInput = {};
    const parsedFormat = parseAdTypeInput(body.adType);
    if (parsedFormat) {
      const base = applyAdTypeToSlotAndSkippable(parsedFormat);
      adData.type = base.type;
      adData.adType = parsedFormat;
      if (parsedFormat === "MID_ROLL") {
        adData.skippable = typeof body.skippable === "boolean" ? body.skippable : true;
      } else if (parsedFormat === "PRE_ROLL_NON_SKIPPABLE") {
        adData.skippable = false;
      } else if (parsedFormat === "PRE_ROLL_SKIPPABLE") {
        adData.skippable = body.skippable !== false;
      } else {
        adData.skippable = base.skippable;
      }
    } else {
      if (body.type === "PRE_ROLL" || body.type === "MID_ROLL") adData.type = body.type;
      if (typeof body.skippable === "boolean") adData.skippable = body.skippable;
      if (shouldSyncAdTypeOnLegacyPatch(existing, body)) {
        const mergedType = (adData.type as VideoAdSlot | undefined) ?? existing.type;
        const mergedSkip =
          typeof adData.skippable === "boolean" ? adData.skippable : existing.skippable;
        adData.adType = syncAdTypeFromSlotAndSkippable(mergedType, mergedSkip);
      }
    }
    if (typeof body.skipAfterSeconds === "number" && Number.isFinite(body.skipAfterSeconds)) {
      adData.skipAfterSeconds = Math.max(0, body.skipAfterSeconds);
    }
    if (typeof body.active === "boolean") adData.active = body.active;

    const mediaType: AdMediaType = body.mediaType ?? existing.mediaType;
    adData.mediaType = mediaType;

    if (mediaType === "VIDEO") {
      const mergedUrl =
        body.videoUrl !== undefined ? normalizeAdMediaUrl(body.videoUrl) ?? existing.videoUrl : existing.videoUrl;
      if (!mergedUrl?.trim()) {
        return NextResponse.json({ error: "videoUrl is required for video ads." }, { status: 400 });
      }
      adData.videoUrl = mergedUrl;
      adData.imageUrl = null;
    } else {
      const mergedImg =
        body.imageUrl !== undefined ? normalizeAdMediaUrl(body.imageUrl) ?? existing.imageUrl : existing.imageUrl;
      if (!mergedImg?.trim()) {
        return NextResponse.json({ error: "imageUrl is required for image ads." }, { status: 400 });
      }
      adData.imageUrl = mergedImg;
      adData.videoUrl = null;
    }

    if (body.thumbnail !== undefined) adData.thumbnail = (body.thumbnail || "").trim() || null;
    if (body.durationSeconds !== undefined) {
      adData.durationSeconds =
        typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds)
          ? Math.max(1, Math.round(body.durationSeconds))
          : null;
    }
    const ct = normalizeCtaType(body.ctaType);
    if (ct) adData.ctaType = ct;
    if (body.ctaLabel !== undefined) adData.ctaLabel = (body.ctaLabel || "").trim() || null;
    if (body.ctaUrl !== undefined) adData.ctaUrl = (body.ctaUrl || "").trim() || null;

    if (body.targeting) {
      const countries = parseStringList(body.targeting.countries);
      const cities = parseStringList(body.targeting.cities);
      const propertyTypes = parseStringList(body.targeting.propertyTypes);
      const priceMin = parseOptionalDecimal(body.targeting.priceMin);
      const priceMax = parseOptionalDecimal(body.targeting.priceMax);
      const userIntent = parseUserIntent(body.targeting.userIntent);
      adData.targeting = {
        upsert: {
          create: { countries, cities, propertyTypes, priceMin, priceMax, userIntent },
          update: { countries, cities, propertyTypes, priceMin, priceMax, userIntent },
        },
      };
    }

    await prisma.ad.update({ where: { id }, data: adData });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ads PATCH", e);
    return NextResponse.json({ error: "Failed to update ad." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }
    if (existing.publisher !== "ADMIN") {
      return NextResponse.json({ error: "Only platform ads can be deleted here." }, { status: 403 });
    }

    await prisma.ad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ads DELETE", e);
    return NextResponse.json({ error: "Failed to delete ad." }, { status: 500 });
  }
}
