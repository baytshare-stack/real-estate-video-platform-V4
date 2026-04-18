import { NextResponse } from "next/server";
import type { VideoAdSlot } from "@prisma/client";
import { pickVideoAdForSlot } from "@/lib/video-ads/pick-ad";

export const runtime = "nodejs";

/** @deprecated Use GET /api/ads/for-video — same response shape for legacy clients. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get("videoId") || "").trim();
    const rawSlot = (searchParams.get("slot") || "PRE_ROLL").trim().toUpperCase();
    const slot = (rawSlot === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL") as VideoAdSlot;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    const ad = await pickVideoAdForSlot(slot);
    return NextResponse.json({ ad }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to serve ad." }, { status: 500 });
  }
}
