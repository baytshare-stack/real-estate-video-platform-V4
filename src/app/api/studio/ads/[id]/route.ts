import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { normalizeAdMediaUrl } from "@/lib/ads-platform/media-url";
import { validateAdActivation } from "@/lib/ads-platform/ad-lifecycle";

type AdStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | "DELETED";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });

  const { id } = await params;
  const body = (await req.json()) as {
    status?: AdStatus;
    type?: "VIDEO" | "IMAGE";
    videoUrl?: string | null;
    imageUrl?: string | null;
    thumbnail?: string | null;
    duration?: number;
    skipAfter?: number;
    ctaType?: "CALL" | "WHATSAPP" | "BOOK_VISIT";
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    placement?: "PRE_ROLL" | "MID_ROLL";
    targeting?: {
      country?: string;
      city?: string;
      area?: string;
      propertyTypes?: string[];
      priceMin?: number | null;
      priceMax?: number | null;
      userIntent?: string | null;
    };
  };

  const existing = await prisma.ad.findFirst({
    where: { id, campaign: { advertiserId: auth.profile.id } },
    include: {
      campaign: { select: { id: true, status: true, budget: true, spent: true } },
      targeting: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "DELETED" && body.status && body.status !== "DELETED") {
    if (body.status !== "DRAFT") {
      return NextResponse.json({ error: "Restore a deleted ad to Draft first." }, { status: 400 });
    }
  }

  const nextType = (body.type ?? existing.type) as "VIDEO" | "IMAGE";
  const nextVideoUrl =
    body.videoUrl !== undefined ? normalizeAdMediaUrl(body.videoUrl) : existing.videoUrl;
  const nextImageUrl =
    body.imageUrl !== undefined ? normalizeAdMediaUrl(body.imageUrl) : existing.imageUrl;

  if (body.status === "ACTIVE") {
    const v = validateAdActivation(
      {
        type: nextType,
        videoUrl: nextVideoUrl,
        imageUrl: nextImageUrl,
        status: existing.status,
      },
      existing.campaign
    );
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  }

  const data: Prisma.AdUpdateInput = {};
  if (body.status) data.status = body.status;
  if (body.type) data.type = body.type;
  if (body.videoUrl !== undefined) data.videoUrl = nextVideoUrl;
  if (body.imageUrl !== undefined) data.imageUrl = nextImageUrl;
  if (body.thumbnail !== undefined) data.thumbnail = normalizeAdMediaUrl(body.thumbnail);
  if (typeof body.duration === "number" && Number.isFinite(body.duration)) data.duration = body.duration;
  if (typeof body.skipAfter === "number" && Number.isFinite(body.skipAfter)) data.skipAfter = body.skipAfter;
  if (body.ctaType) data.ctaType = body.ctaType;
  if (body.ctaLabel !== undefined) data.ctaLabel = body.ctaLabel || null;
  if (body.ctaUrl !== undefined) data.ctaUrl = body.ctaUrl?.trim() || null;
  if (body.placement) data.placement = body.placement;

  const t = body.targeting;
  if (t) {
    const country = String(t.country ?? "").trim();
    const city = String(t.city ?? "").trim();
    const area = String(t.area ?? "").trim();
    await prisma.targeting.upsert({
      where: { adId: id },
      create: {
        adId: id,
        country,
        city,
        area,
        propertyTypes: Array.isArray(t.propertyTypes) ? t.propertyTypes.map(String) : [],
        priceMin: typeof t.priceMin === "number" ? t.priceMin : null,
        priceMax: typeof t.priceMax === "number" ? t.priceMax : null,
        userIntent: t.userIntent ?? null,
      },
      update: {
        country,
        city,
        area,
        propertyTypes: Array.isArray(t.propertyTypes) ? t.propertyTypes.map(String) : [],
        priceMin: typeof t.priceMin === "number" ? t.priceMin : null,
        priceMax: typeof t.priceMax === "number" ? t.priceMax : null,
        userIntent: t.userIntent === undefined ? undefined : t.userIntent,
      },
    });
  }

  const ad =
    Object.keys(data).length > 0
      ? await prisma.ad.update({
          where: { id },
          data,
          include: { campaign: true, targeting: true, performance: true },
        })
      : await prisma.ad.findUnique({
          where: { id },
          include: { campaign: true, targeting: true, performance: true },
        });

  return NextResponse.json({ ad });
}
