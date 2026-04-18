import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { recordAdLeadMetrics } from "@/lib/ads-platform/ad-metrics";
import { chargeForLead } from "@/lib/ads-platform/billing";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      adId?: string;
      videoId?: string;
      name?: string;
      phone?: string;
      source?: "AD" | "VIDEO";
    };
    const adId = String(body.adId || "").trim();
    const videoId = body.videoId ? String(body.videoId).trim() : "";
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    if (!adId || !name || !phone) {
      return NextResponse.json({ error: "adId, name, phone are required" }, { status: 400 });
    }

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: {
        id: true,
        publisher: true,
        ownerId: true,
        campaignId: true,
        campaign: { select: { id: true, advertiser: { select: { userId: true } } } },
      },
    });
    if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

    let videoChannelOwner: string | null = null;
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, channel: { select: { ownerId: true } } },
      });
      videoChannelOwner = video?.channel?.ownerId ?? null;
    }

    const agentId =
      ad.publisher === "USER"
        ? ad.ownerId
        : ad.campaign?.advertiser?.userId ?? videoChannelOwner ?? null;

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    const lead = await prisma.lead.create({
      data: {
        adId,
        campaignId: ad.campaignId,
        userId: userId || null,
        videoId: videoId || null,
        agentId,
        name,
        phone,
        source: body.source || "AD",
      },
    });

    await recordAdLeadMetrics(adId);
    if (ad.publisher === "USER" && ad.campaignId) {
      await chargeForLead({ campaignId: ad.campaignId, adId });
    }

    const msg = `Lead from ad (${adId}): ${name} — ${phone}`;
    await prisma.crmEvent.create({
      data: {
        type: "AD_LEAD",
        userId: userId || null,
        channelId: agentId,
        videoId: videoId || null,
        metadata: { adId, leadId: lead.id, agentId, name, phone },
      },
    });

    return NextResponse.json({
      ok: true,
      lead,
      whatsappLink: `https://wa.me/?text=${encodeURIComponent(msg)}`,
    });
  } catch (e) {
    console.error("lead capture error", e);
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
