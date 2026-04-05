import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { recordSmartAdClick } from "@/lib/smart-ads/record";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { creativeId?: string; adId?: string; videoId?: string };
    const adId = (body.adId || "").trim();
    const videoId = (body.videoId || "").trim();

    if (adId && videoId) {
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

      await recordSmartAdClick(prisma, { adId, videoId, userId: userId ?? null });
      return NextResponse.json({ ok: true });
    }

    const creativeId = (body.creativeId || "").trim();
    if (!creativeId) {
      return NextResponse.json({ error: "creativeId or (adId + videoId) are required." }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "AdCreative" SET clicks = clicks + 1 WHERE id = $1`,
      creativeId
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ad click error", e);
    return NextResponse.json({ error: "Failed to track click." }, { status: 500 });
  }
}
