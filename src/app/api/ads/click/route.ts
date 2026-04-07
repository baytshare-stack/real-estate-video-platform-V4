import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { applyCampaignSpendForClick } from "@/lib/ads-platform/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { adId?: string };
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

    const bill = await applyCampaignSpendForClick(adId);
    if (!bill.ok) {
      const status = bill.reason === "not_found" ? 404 : 402;
      return NextResponse.json({ error: "Billing failed.", reason: bill.reason }, { status });
    }

    await prisma.adPerformance.upsert({
      where: { adId },
      update: { clicks: { increment: 1 } },
      create: { adId, clicks: 1 },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ad click error", e);
    return NextResponse.json({ error: "Failed to track click." }, { status: 500 });
  }
}
