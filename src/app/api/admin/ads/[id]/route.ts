import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type PatchBody = {
  type?: "VIDEO" | "IMAGE";
  videoUrl?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
  duration?: number;
  skipAfter?: number;
  placement?: "PRE_ROLL" | "MID_ROLL";
  ctaType?: "CALL" | "WHATSAPP" | "BOOK_VISIT";
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
  targeting?: {
    country?: string;
    city?: string;
    area?: string;
    propertyTypes?: string[];
    priceMin?: number | null;
    priceMax?: number | null;
  };
  campaignBudget?: number;
  campaignDailyBudget?: number;
  bidWeight?: number;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const existing = await prisma.ad.findUnique({
      where: { id },
      include: { targeting: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }

    const body = (await req.json()) as PatchBody;

    const adData: Prisma.AdUpdateInput = {};
    if (body.type) adData.type = body.type;
    if (body.videoUrl !== undefined) adData.videoUrl = body.videoUrl?.trim() || null;
    if (body.imageUrl !== undefined) adData.imageUrl = body.imageUrl?.trim() || null;
    if (body.thumbnail !== undefined) adData.thumbnail = body.thumbnail?.trim() || null;
    if (typeof body.duration === "number" && !Number.isNaN(body.duration)) adData.duration = body.duration;
    if (typeof body.skipAfter === "number" && !Number.isNaN(body.skipAfter)) adData.skipAfter = body.skipAfter;
    if (body.placement) adData.placement = body.placement;
    if (body.ctaType) adData.ctaType = body.ctaType;
    if (body.ctaLabel !== undefined) adData.ctaLabel = body.ctaLabel?.trim() || null;
    if (body.ctaUrl !== undefined) adData.ctaUrl = body.ctaUrl?.trim() || null;
    if (body.status) adData.status = body.status;

    const campaignData: Prisma.CampaignUpdateInput = {};
    if (typeof body.campaignBudget === "number" && !Number.isNaN(body.campaignBudget)) {
      campaignData.budget = body.campaignBudget;
    }
    if (typeof body.campaignDailyBudget === "number" && !Number.isNaN(body.campaignDailyBudget)) {
      campaignData.dailyBudget = body.campaignDailyBudget;
    }
    if (typeof body.bidWeight === "number" && !Number.isNaN(body.bidWeight)) {
      campaignData.bidWeight = body.bidWeight;
    }

    const t = body.targeting;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(adData).length) {
        await tx.ad.update({ where: { id }, data: adData });
      }
      if (Object.keys(campaignData).length) {
        await tx.campaign.update({ where: { id: existing.campaignId }, data: campaignData });
      }
      if (t) {
        const cur = existing.targeting;
        const merged = {
          country: t.country !== undefined ? String(t.country).trim() : (cur?.country ?? ""),
          city: t.city !== undefined ? String(t.city).trim() : (cur?.city ?? ""),
          area: t.area !== undefined ? String(t.area).trim() : (cur?.area ?? ""),
          propertyTypes:
            t.propertyTypes !== undefined ? t.propertyTypes.map(String) : (cur?.propertyTypes ?? []),
          priceMin: t.priceMin !== undefined ? t.priceMin : cur?.priceMin ?? null,
          priceMax: t.priceMax !== undefined ? t.priceMax : cur?.priceMax ?? null,
        };
        await tx.targeting.upsert({
          where: { adId: id },
          create: {
            adId: id,
            country: merged.country,
            city: merged.city,
            area: merged.area,
            propertyTypes: merged.propertyTypes,
            priceMin: merged.priceMin,
            priceMax: merged.priceMax,
          },
          update: {
            country: merged.country,
            city: merged.city,
            area: merged.area,
            propertyTypes: merged.propertyTypes,
            priceMin: merged.priceMin,
            priceMax: merged.priceMax,
          },
        });
      }
    });

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

    await prisma.ad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ads DELETE", e);
    return NextResponse.json({ error: "Failed to delete ad." }, { status: 500 });
  }
}
