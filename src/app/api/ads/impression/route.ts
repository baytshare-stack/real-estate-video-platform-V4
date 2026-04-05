import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { recordSmartAdImpression } from "@/lib/smart-ads/record";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { adId?: string; videoId?: string };
    const adId = (body.adId || "").trim();
    const videoId = (body.videoId || "").trim();
    if (!adId || !videoId) {
      return NextResponse.json({ error: "adId and videoId are required." }, { status: 400 });
    }

    const [ad, video] = await Promise.all([
      prisma.ad.findUnique({ where: { id: adId }, select: { id: true, isActive: true } }),
      prisma.video.findUnique({ where: { id: videoId }, select: { id: true } }),
    ]);

    if (!ad || !ad.isActive) {
      return NextResponse.json({ error: "Ad not found or inactive." }, { status: 404 });
    }
    if (!video) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    await recordSmartAdImpression(prisma, { adId, videoId, userId: userId ?? null });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ad impression error", e);
    return NextResponse.json({ error: "Failed to record impression." }, { status: 500 });
  }
}
