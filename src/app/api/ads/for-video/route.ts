import { NextResponse } from "next/server";
import type { VideoAdSlot } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { pickNonLinearVideoAdForWatchContext, pickVideoAdForWatchContext } from "@/lib/video-ads/pick-ad";
import { servableVideoAdPayload } from "@/lib/video-ads/servable-payload";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get("videoId") || "").trim();
    const rawSlot = (searchParams.get("slot") || "PRE_ROLL").trim().toUpperCase();
    const viewerKey = (searchParams.get("viewerKey") || "").trim().slice(0, 160) || null;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const viewerUserId = (session?.user?.id as string | undefined) ?? null;
    const pickOpts = { viewerKey, viewerUserId };

    let raw: Awaited<ReturnType<typeof pickVideoAdForWatchContext>> = null;
    if (rawSlot === "OVERLAY" || rawSlot === "COMPANION") {
      raw = await pickNonLinearVideoAdForWatchContext(videoId, "OVERLAY", pickOpts);
    } else if (rawSlot === "CTA") {
      raw = await pickNonLinearVideoAdForWatchContext(videoId, "CTA", pickOpts);
    } else {
      const slot = (rawSlot === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL") as VideoAdSlot;
      raw = await pickVideoAdForWatchContext(videoId, slot, pickOpts);
    }
    const ad = servableVideoAdPayload(raw);
    return NextResponse.json({ ad, videoId });
  } catch (e) {
    console.error("for-video ads error", e);
    return NextResponse.json({ error: "Failed to load ads for video." }, { status: 500 });
  }
}
