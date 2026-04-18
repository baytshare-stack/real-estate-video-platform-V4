import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordAdImpressionMetrics } from "@/lib/ads-platform/ad-metrics";
import { chargeForAdImpression } from "@/lib/ads-platform/billing";
import { bumpViewerAdFrequency } from "@/lib/ads-platform/viewer-frequency";

export const runtime = "nodejs";

/** Records a served impression; USER campaign ads consume a small slice of campaign budget. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { adId?: string; viewerKey?: string };
    const adId = (body.adId || "").trim();
    const viewerKey = (body.viewerKey || "").trim().slice(0, 160) || null;
    if (!adId) {
      return NextResponse.json({ error: "adId is required." }, { status: 400 });
    }

    if (adId.startsWith("mock-")) {
      return NextResponse.json({ ok: true });
    }

    const ad = await prisma.ad.findFirst({
      where: { id: adId, active: true },
      select: { id: true, publisher: true },
    });
    if (!ad) {
      return NextResponse.json({ error: "Ad not found or inactive." }, { status: 404 });
    }

    await recordAdImpressionMetrics(adId);
    await bumpViewerAdFrequency(viewerKey, adId);
    if (ad.publisher === "USER") {
      await chargeForAdImpression(adId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ad impression error", e);
    return NextResponse.json({ error: "Failed to record impression." }, { status: 500 });
  }
}
