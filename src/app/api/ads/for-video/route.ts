import { NextResponse } from "next/server";
import type { VideoAdSlot } from "@prisma/client";
import { pickVideoAdForWatchContext } from "@/lib/video-ads/pick-ad";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get("videoId") || "").trim();
    const rawSlot = (searchParams.get("slot") || "PRE_ROLL").trim().toUpperCase();
    const slot = (rawSlot === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL") as VideoAdSlot;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    const ad = await pickVideoAdForWatchContext(videoId, slot);
    return NextResponse.json({ ad, videoId });
  } catch (e) {
    console.error("for-video ads error", e);
    return NextResponse.json({ error: "Failed to load ads for video." }, { status: 500 });
  }
}
