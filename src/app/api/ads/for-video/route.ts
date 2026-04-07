import { NextResponse } from "next/server";
import { buildVideoContext, pickBestAdForSlot } from "@/lib/ads-platform/engine";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get("videoId") || "").trim();
    const slot = (searchParams.get("slot") || "PRE_ROLL").trim().toUpperCase() as "PRE_ROLL" | "MID_ROLL";
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    const context = await buildVideoContext(videoId);
    if (!context) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    const picked = await pickBestAdForSlot(context, slot);
    const ad = picked?.ad ?? null;

    return NextResponse.json({
      ad: ad
        ? {
            id: ad.id,
            campaignId: ad.campaignId,
            type: ad.type,
            videoUrl: ad.videoUrl,
            imageUrl: ad.imageUrl,
            thumbnail: ad.thumbnail,
            duration: ad.duration,
            skipAfter: ad.skipAfter,
            ctaType: ad.ctaType,
            ctaLabel: ad.ctaLabel,
            ctaUrl: ad.ctaUrl,
            placement: ad.placement,
            score: picked?.score ?? 0,
            relevance: picked?.relevance ?? 0,
          }
        : null,
      videoId,
    });
  } catch (e) {
    console.error("for-video ads error", e);
    return NextResponse.json({ error: "Failed to load ads for video." }, { status: 500 });
  }
}
