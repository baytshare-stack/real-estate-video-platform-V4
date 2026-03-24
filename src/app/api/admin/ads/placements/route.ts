import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = (searchParams.get("campaignId") || "").trim();
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        campaignId: string;
        videoId: string;
        createdAt: Date;
        videoTitle: string;
      }>
    >(
      `
      SELECT
        p.id,
        p."campaignId",
        p."videoId",
        p."createdAt",
        v.title as "videoTitle"
      FROM "AdPlacement" p
      JOIN "Video" v ON v.id = p."videoId"
      WHERE p."campaignId" = $1
      ORDER BY p."createdAt" DESC
      LIMIT 500
      `,
      campaignId
    );

    return NextResponse.json({
      placements: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load placements." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { campaignId?: string; videoId?: string };
    const campaignId = (body.campaignId || "").trim();
    const videoId = (body.videoId || "").trim();
    if (!campaignId || !videoId) {
      return NextResponse.json({ error: "campaignId and videoId are required." }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      INSERT INTO "AdPlacement" (id, "campaignId", "videoId", "createdAt")
      VALUES (gen_random_uuid()::text, $1, $2, now())
      ON CONFLICT ("campaignId","videoId") DO UPDATE SET "createdAt" = EXCLUDED."createdAt"
      RETURNING id
      `,
      campaignId,
      videoId
    );

    return NextResponse.json({ id: rows?.[0]?.id });
  } catch {
    return NextResponse.json({ error: "Failed to assign campaign to video." }, { status: 500 });
  }
}

