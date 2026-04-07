import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordViewerAdDayImpression } from "@/lib/ads-platform/frequency-cap";
import { resolveAdViewerKey } from "@/lib/ads-platform/viewer-key";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { adId?: string; videoId?: string };
    const adId = (body.adId || "").trim();
    if (!adId) {
      return NextResponse.json({ error: "adId is required." }, { status: 400 });
    }

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { id: true, status: true },
    });
    if (!ad || ad.status !== "ACTIVE") {
      return NextResponse.json({ error: "Ad not found or inactive." }, { status: 404 });
    }
    await prisma.adPerformance.upsert({
      where: { adId: ad.id },
      update: { impressions: { increment: 1 }, views: { increment: 1 }, watchTime: { increment: 5 } },
      create: { adId: ad.id, impressions: 1, views: 1, watchTime: 5 },
    });

    const { viewerKey } = await resolveAdViewerKey(req);
    await recordViewerAdDayImpression(viewerKey, ad.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ad impression error", e);
    return NextResponse.json({ error: "Failed to record impression." }, { status: 500 });
  }
}
