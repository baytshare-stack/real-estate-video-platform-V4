import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { adId?: string };
    const adId = (body.adId || "").trim();
    if (!adId) {
      return NextResponse.json({ error: "adId is required." }, { status: 400 });
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
