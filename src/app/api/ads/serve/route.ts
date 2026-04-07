import { NextResponse } from "next/server";
import { buildVideoContext, pickBestAdForSlot } from "@/lib/ads-platform/engine";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get("videoId") || "").trim();
    const slot = (searchParams.get("slot") || "PRE_ROLL").trim().toUpperCase() as "PRE_ROLL" | "MID_ROLL";

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    const ctx = await buildVideoContext(videoId);
    if (!ctx) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    const picked = await pickBestAdForSlot(ctx, slot);
    const ad = picked?.ad;

    return NextResponse.json(
      {
        ad: ad
          ? {
              id: ad.id,
              type: ad.type,
              videoUrl: ad.videoUrl,
              imageUrl: ad.imageUrl,
              thumbnail: ad.thumbnail,
              ctaUrl: ad.ctaUrl,
              placement: ad.placement,
              score: picked?.score ?? 0,
            }
          : null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to serve ad." }, { status: 500 });
  }
}
