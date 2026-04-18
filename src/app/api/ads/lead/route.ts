import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

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
    const videoId = String(body.videoId || "").trim();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    if (!adId || !videoId || !name || !phone) {
      return NextResponse.json({ error: "adId, videoId, name, phone are required" }, { status: 400 });
    }

    const [ad, video] = await Promise.all([
      prisma.ad.findUnique({
      where: { id: adId },
      select: { id: true },
      }),
      prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, channel: { select: { ownerId: true } } },
      }),
    ]);
    if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    if (!video?.channel?.ownerId) return NextResponse.json({ error: "Video/agent not found" }, { status: 404 });

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    const lead = await prisma.lead.create({
      data: {
        adId,
        userId: userId || null,
        videoId,
        agentId: video.channel.ownerId,
        name,
        phone,
        source: body.source || "AD",
      },
    });

    await prisma.crmEvent.create({
      data: {
        type: "AD_LEAD",
        userId: userId || null,
        channelId: video.channel.ownerId,
        videoId,
        metadata: { adId, leadId: lead.id, agentId: video.channel.ownerId, name, phone },
      },
    });

    return NextResponse.json({
      ok: true,
      lead,
      whatsappLink: `https://wa.me/?text=${encodeURIComponent(`Lead from ad ${adId}: ${name} - ${phone}`)}`,
    });
  } catch (e) {
    console.error("lead capture error", e);
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}

