import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

function jsonDecimal(n: Prisma.Decimal | null | undefined): string | null {
  if (n == null) return null;
  return n.toString();
}

export async function GET() {
  try {
    const [ads, campaigns] = await Promise.all([
      prisma.ad.findMany({
        orderBy: { createdAt: "desc" },
        take: 300,
        include: {
          campaign: {
            include: {
              advertiser: {
                select: { id: true, businessName: true, user: { select: { email: true } } },
              },
            },
          },
          targeting: true,
          performance: true,
        },
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
        campaignId: a.campaignId,
        type: a.type,
        videoUrl: a.videoUrl,
        imageUrl: a.imageUrl,
        thumbnail: a.thumbnail,
        duration: a.duration,
        skipAfter: a.skipAfter,
        ctaType: a.ctaType,
        ctaLabel: a.ctaLabel,
        ctaUrl: a.ctaUrl,
        status: a.status,
        placement: a.placement,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        campaign: {
          id: a.campaign.id,
          name: a.campaign.name,
          status: a.campaign.status,
          budget: jsonDecimal(a.campaign.budget),
          dailyBudget: jsonDecimal(a.campaign.dailyBudget),
          spent: jsonDecimal(a.campaign.spent),
          bidWeight: a.campaign.bidWeight,
          startDate: a.campaign.startDate.toISOString(),
          endDate: a.campaign.endDate.toISOString(),
          advertiserName: a.campaign.advertiser.businessName,
          advertiserEmail: a.campaign.advertiser.user?.email ?? null,
        },
        targeting: a.targeting
          ? {
              country: a.targeting.country,
              city: a.targeting.city,
              area: a.targeting.area,
              propertyTypes: a.targeting.propertyTypes,
              priceMin: jsonDecimal(a.targeting.priceMin),
              priceMax: jsonDecimal(a.targeting.priceMax),
            }
          : null,
        performance: a.performance
          ? {
              impressions: a.performance.impressions,
              views: a.performance.views,
              clicks: a.performance.clicks,
              leads: a.performance.leads,
            }
          : null,
      })),
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        budget: jsonDecimal(c.budget),
        dailyBudget: jsonDecimal(c.dailyBudget),
        spent: jsonDecimal(c.spent),
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
  campaignId?: string;
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBody;
    const campaignId = (body.campaignId || "").trim();
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 400 });
    }

    const t = body.targeting || {};
    const country = String(t.country ?? "").trim();
    const city = String(t.city ?? "").trim();
    const area = String(t.area ?? "").trim();

    const updateCampaign: Prisma.CampaignUpdateInput = {};
    if (typeof body.campaignBudget === "number" && !Number.isNaN(body.campaignBudget)) {
      updateCampaign.budget = body.campaignBudget;
    }
    if (typeof body.campaignDailyBudget === "number" && !Number.isNaN(body.campaignDailyBudget)) {
      updateCampaign.dailyBudget = body.campaignDailyBudget;
    }
    if (typeof body.bidWeight === "number" && !Number.isNaN(body.bidWeight)) {
      updateCampaign.bidWeight = body.bidWeight;
    }

    const ad = await prisma.$transaction(async (tx) => {
      if (Object.keys(updateCampaign).length) {
        await tx.campaign.update({ where: { id: campaignId }, data: updateCampaign });
      }
      return tx.ad.create({
        data: {
          campaignId,
          type: body.type || "VIDEO",
          videoUrl: body.videoUrl?.trim() || null,
          imageUrl: body.imageUrl?.trim() || null,
          thumbnail: body.thumbnail?.trim() || null,
          duration: Number(body.duration ?? 15) || 15,
          skipAfter: Number(body.skipAfter ?? 5) || 5,
          ctaType: body.ctaType || "WHATSAPP",
          ctaLabel: body.ctaLabel?.trim() || null,
          ctaUrl: body.ctaUrl?.trim() || null,
          placement: body.placement || "PRE_ROLL",
          status: body.status || "ACTIVE",
          targeting: {
            create: {
              country,
              city,
              area,
              propertyTypes: Array.isArray(t.propertyTypes) ? t.propertyTypes.map(String) : [],
              priceMin: typeof t.priceMin === "number" ? t.priceMin : null,
              priceMax: typeof t.priceMax === "number" ? t.priceMax : null,
            },
          },
          performance: { create: {} },
        },
        include: { targeting: true, campaign: true, performance: true },
      });
    });

    return NextResponse.json({ ok: true, adId: ad.id });
  } catch (e) {
    console.error("admin ads POST", e);
    return NextResponse.json({ error: "Failed to create ad." }, { status: 500 });
  }
}
