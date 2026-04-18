import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordAdViewMetrics } from "@/lib/ads-platform/ad-metrics";

export const runtime = "nodejs";

/** Counts a completed or meaningful ad view (client calls once per ad break). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { adId?: string; watchSeconds?: number };
    const adId = (body.adId || "").trim();
    if (!adId) {
      return NextResponse.json({ error: "adId is required." }, { status: 400 });
    }

    if (adId.startsWith("mock-")) {
      return NextResponse.json({ ok: true });
    }

    const ad = await prisma.ad.findFirst({
      where: { id: adId, active: true },
      select: { id: true },
    });
    if (!ad) {
      return NextResponse.json({ error: "Ad not found or inactive." }, { status: 404 });
    }

    await recordAdViewMetrics(adId, body.watchSeconds);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ad view error", e);
    return NextResponse.json({ error: "Failed to record view." }, { status: 500 });
  }
}
