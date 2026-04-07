import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ ads: [] });

  const ads = await prisma.ad.findMany({
    where: { campaign: { advertiserId: auth.profile.id } },
    include: { campaign: true, targeting: true, performance: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ads });
}

export async function POST(req: Request) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });

  const body = (await req.json()) as {
    campaignId?: string;
    type?: "VIDEO" | "IMAGE";
    videoUrl?: string;
    imageUrl?: string;
    thumbnail?: string;
    duration?: number;
    skipAfter?: number;
    ctaType?: "CALL" | "WHATSAPP" | "BOOK_VISIT";
    ctaLabel?: string;
    ctaUrl?: string;
    placement?: "PRE_ROLL" | "MID_ROLL";
    targeting?: {
      country?: string;
      city?: string;
      area?: string;
      /** @deprecated use country */
      countries?: string[];
      /** @deprecated use city */
      cities?: string[];
      propertyTypes?: string[];
      priceMin?: number;
      priceMax?: number;
      userIntent?: string;
    };
  };

  const campaign = await prisma.campaign.findFirst({
    where: { id: body.campaignId, advertiserId: auth.profile.id },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: "Invalid campaignId" }, { status: 400 });

  const t = body.targeting;
  const country = (t?.country ?? t?.countries?.[0] ?? "").trim();
  const city = (t?.city ?? t?.cities?.[0] ?? "").trim();
  const area = (t?.area ?? "").trim();

  const ad = await prisma.ad.create({
    data: {
      campaignId: campaign.id,
      type: body.type || "VIDEO",
      videoUrl: body.videoUrl || null,
      imageUrl: body.imageUrl || null,
      thumbnail: body.thumbnail || null,
      duration: Number(body.duration || 15),
      skipAfter: Number(body.skipAfter || 5),
      ctaType: body.ctaType || "WHATSAPP",
      ctaLabel: body.ctaLabel || null,
      ctaUrl: body.ctaUrl || null,
      placement: body.placement || "PRE_ROLL",
      status: "ACTIVE",
      targeting: {
        create: {
          country,
          city,
          area,
          propertyTypes: t?.propertyTypes || [],
          priceMin: typeof t?.priceMin === "number" ? t.priceMin : null,
          priceMax: typeof t?.priceMax === "number" ? t.priceMax : null,
          userIntent: t?.userIntent || null,
        },
      },
      performance: { create: {} },
    },
    include: { targeting: true, performance: true },
  });

  return NextResponse.json({ ad });
}

