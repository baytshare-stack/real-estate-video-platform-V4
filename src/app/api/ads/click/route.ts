import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordAdClickMetrics } from "@/lib/ads-platform/ad-metrics";
import { chargeForAdClick } from "@/lib/ads-platform/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { adId?: string };
    const adId = (body.adId || "").trim();
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

    await recordAdClickMetrics(adId);
    if (ad.publisher === "USER") {
      await chargeForAdClick(adId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ad click error", e);
    return NextResponse.json({ error: "Failed to track click." }, { status: 500 });
  }
}
