import { NextResponse } from "next/server";
import type { VideoAdSlot } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { pickVideoAdForWatchContext } from "@/lib/video-ads/pick-ad";
import { servableVideoAdPayload } from "@/lib/video-ads/servable-payload";

export const runtime = "nodejs";

/** @deprecated Use GET /api/ads/for-video — same response shape for legacy clients. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get("videoId") || "").trim();
    const rawSlot = (searchParams.get("slot") || "PRE_ROLL").trim().toUpperCase();
    const slot = (rawSlot === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL") as VideoAdSlot;
    const viewerKey = (searchParams.get("viewerKey") || "").trim().slice(0, 160) || null;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const viewerUserId = (session?.user?.id as string | undefined) ?? null;

    const raw = await pickVideoAdForWatchContext(videoId, slot, { viewerKey, viewerUserId });
    const ad = servableVideoAdPayload(raw);
    return NextResponse.json({ ad }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to serve ad." }, { status: 500 });
  }
}
