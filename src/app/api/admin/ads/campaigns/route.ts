import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Status = "DRAFT" | "ACTIVE" | "PAUSED";

function asString(v: string | null) {
  return (v || "").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = asString(searchParams.get("q"));

    const where: string[] = [];
    const params: any[] = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(c.name ILIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        status: Status;
        createdAt: Date;
        creativesCount: number;
        placementsCount: number;
      }>
    >(
      `
      SELECT
        c.id,
        c.name,
        c.status,
        c."createdAt",
        (SELECT COUNT(*)::int FROM "AdCreative" cr WHERE cr."campaignId" = c.id) as "creativesCount",
        (SELECT COUNT(*)::int FROM "AdPlacement" p WHERE p."campaignId" = c.id) as "placementsCount"
      FROM "AdCampaign" c
      ${whereSql}
      ORDER BY c."createdAt" DESC
      LIMIT 200
      `,
      ...params
    );

    return NextResponse.json({
      campaigns: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load campaigns." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; status?: Status };
    const name = (body.name || "").trim();
    const status = body.status || "DRAFT";

    if (!name) {
      return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
    }
    if (status !== "DRAFT" && status !== "ACTIVE" && status !== "PAUSED") {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "AdCampaign" (id, name, status, "createdAt") VALUES (gen_random_uuid()::text, $1, $2, now()) RETURNING id`,
      name,
      status
    );

    const id = rows?.[0]?.id;
    if (!id) return NextResponse.json({ error: "Failed to create campaign." }, { status: 500 });

    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Failed to create campaign." }, { status: 500 });
  }
}

