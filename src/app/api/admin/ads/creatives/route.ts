import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type CreativeType = "IMAGE" | "VIDEO";

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
        type: CreativeType;
        mediaUrl: string;
        clickUrl: string | null;
        impressions: number;
        clicks: number;
        createdAt: Date;
      }>
    >(
      `
      SELECT id, "campaignId", type, "mediaUrl", "clickUrl", impressions, clicks, "createdAt"
      FROM "AdCreative"
      WHERE "campaignId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 200
      `,
      campaignId
    );

    return NextResponse.json({
      creatives: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load creatives." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      campaignId?: string;
      type?: CreativeType;
      mediaUrl?: string;
      clickUrl?: string;
    };
    const campaignId = (body.campaignId || "").trim();
    const type = body.type;
    const mediaUrl = (body.mediaUrl || "").trim();
    const clickUrl = (body.clickUrl || "").trim();

    if (!campaignId) return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
    if (type !== "IMAGE" && type !== "VIDEO") return NextResponse.json({ error: "Invalid type." }, { status: 400 });
    if (!mediaUrl) return NextResponse.json({ error: "mediaUrl is required." }, { status: 400 });

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      INSERT INTO "AdCreative"
        (id, "campaignId", type, "mediaUrl", "clickUrl", "createdAt", impressions, clicks)
      VALUES
        (gen_random_uuid()::text, $1, $2, $3, NULLIF($4, ''), now(), 0, 0)
      RETURNING id
      `,
      campaignId,
      type,
      mediaUrl,
      clickUrl
    );

    const id = rows?.[0]?.id;
    if (!id) return NextResponse.json({ error: "Failed to create creative." }, { status: 500 });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Failed to create creative." }, { status: 500 });
  }
}

