import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = (searchParams.get("videoId") || "").trim();

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    // Pick a random ACTIVE campaign assigned to this video.
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        campaignId: string;
        creativeId: string;
        type: "IMAGE" | "VIDEO";
        mediaUrl: string;
        clickUrl: string | null;
      }>
    >(
      `
      SELECT
        c.id as "campaignId",
        cr.id as "creativeId",
        cr.type,
        cr."mediaUrl" as "mediaUrl",
        cr."clickUrl" as "clickUrl"
      FROM "AdPlacement" p
      JOIN "AdCampaign" c ON c.id = p."campaignId"
      JOIN "AdCreative" cr ON cr."campaignId" = c.id
      WHERE p."videoId" = $1
        AND c.status = 'ACTIVE'
      ORDER BY random()
      LIMIT 1
      `,
      videoId
    );

    const ad = rows?.[0];
    if (!ad) {
      return NextResponse.json({ message: "No ads available" }, { status: 200 });
    }

    // Track impression
    await prisma.$executeRawUnsafe(
      `UPDATE "AdCreative" SET impressions = impressions + 1 WHERE id = $1`,
      ad.creativeId
    );

    return NextResponse.json(
      {
        ad: {
          creativeId: ad.creativeId,
          type: ad.type,
          mediaUrl: ad.mediaUrl,
          clickUrl: ad.clickUrl,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to serve ad." }, { status: 500 });
  }
}
