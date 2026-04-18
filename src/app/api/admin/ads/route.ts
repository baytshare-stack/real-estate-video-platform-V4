import { NextResponse } from "next/server";
import type { AdCtaType, AdMediaType, VideoAdSlot } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeAdMediaUrl } from "@/lib/ads-platform/media-url";
import { parseOptionalDecimal, parseStringList, parseUserIntent } from "@/lib/ads-platform/targeting-body";

function normalizeCtaType(v: unknown): AdCtaType {
  const s = String(v || "").toUpperCase();
  if (s === "CALL" || s === "BOOK_VISIT") return s;
  return "WHATSAPP";
}

export async function GET() {
  try {
    const [ads, campaigns] = await Promise.all([
      prisma.ad.findMany({
        where: { publisher: "ADMIN" },
        orderBy: { updatedAt: "desc" },
        take: 500,
        include: { targeting: true, performance: true },
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
        mediaType: a.mediaType,
        videoUrl: a.videoUrl,
        imageUrl: a.imageUrl,
        thumbnail: a.thumbnail,
        durationSeconds: a.durationSeconds,
        ctaType: a.ctaType,
        ctaLabel: a.ctaLabel,
        ctaUrl: a.ctaUrl,
        type: a.type,
        skippable: a.skippable,
        skipAfterSeconds: a.skipAfterSeconds,
        active: a.active,
        targeting: a.targeting,
        performance: a.performance,
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
  mediaType?: AdMediaType;
  videoUrl?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
  durationSeconds?: number | null;
  ctaType?: AdCtaType;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  type?: VideoAdSlot;
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBody;
    const type = body.type === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL";
    const skippable = body.skippable !== false;
    const skipAfterSeconds = Math.max(0, Number(body.skipAfterSeconds ?? 5) || 5);
    const active = body.active !== false;
    const mediaType: AdMediaType = body.mediaType === "IMAGE" ? "IMAGE" : "VIDEO";
    const videoUrl = mediaType === "VIDEO" ? normalizeAdMediaUrl(body.videoUrl) : null;
    const imageUrl = mediaType === "IMAGE" ? normalizeAdMediaUrl(body.imageUrl) : null;
    if (mediaType === "VIDEO" && !videoUrl) {
      return NextResponse.json({ error: "videoUrl is required for video ads." }, { status: 400 });
    }
    if (mediaType === "IMAGE" && !imageUrl) {
      return NextResponse.json({ error: "imageUrl is required for image ads." }, { status: 400 });
    }

    const t = body.targeting;
    const countries = parseStringList(t?.countries);
    const cities = parseStringList(t?.cities);
    const propertyTypes = parseStringList(t?.propertyTypes);
    const priceMin = parseOptionalDecimal(t?.priceMin);
    const priceMax = parseOptionalDecimal(t?.priceMax);
    const userIntent = parseUserIntent(t?.userIntent);

    const ctaType = normalizeCtaType(body.ctaType);
    const ctaLabel = (body.ctaLabel || "").trim() || "Learn more";
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
        publisher: "ADMIN",
        mediaType,
        videoUrl,
        imageUrl,
        thumbnail,
        durationSeconds,
        ctaType,
        ctaLabel,
        ctaUrl,
        type,
        skippable,
        skipAfterSeconds,
        active,
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
  } catch (e) {
    console.error("admin ads POST", e);
    return NextResponse.json({ error: "Failed to create ad." }, { status: 500 });
  }
}
