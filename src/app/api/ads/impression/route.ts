import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/** Lightweight acknowledgement — no wallet / campaign billing on video inventory ads. */
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
      select: { id: true },
    });
    if (!ad) {
      return NextResponse.json({ error: "Ad not found or inactive." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ad impression error", e);
    return NextResponse.json({ error: "Failed to record impression." }, { status: 500 });
  }
}
