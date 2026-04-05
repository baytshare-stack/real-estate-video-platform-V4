import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ensureDemoSmartAd } from "@/lib/ensure-demo-smart-ad";
import { getBestAdsForVideo } from "@/lib/smart-ads/engine";
import { selectionToWatchPayloads } from "@/lib/smart-ads/watch-payload";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get("videoId") || "").trim();
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    await ensureDemoSmartAd(prisma);

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    const { selection, context } = await getBestAdsForVideo(prisma, videoId, userId ?? null);
    const ads = selectionToWatchPayloads(selection);

    return NextResponse.json({
      ads,
      videoId,
      match: context
        ? {
            category: context.categoryNorm,
            location: context.locationNorm,
            views: context.views,
          }
        : null,
    });
  } catch (e) {
    console.error("for-video ads error", e);
    return NextResponse.json({ error: "Failed to load ads for video." }, { status: 500 });
  }
}
