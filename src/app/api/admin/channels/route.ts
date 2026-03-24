import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function asString(v: string | null) {
  return (v || "").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = asString(searchParams.get("search"));

    const where: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(c.name ILIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        subscribersCount: number;
        totalVideos: number;
      }>
    >(
      `
      SELECT
        c.id,
        c.name,
        c."subscribersCount",
        COUNT(v.id)::int as "totalVideos"
      FROM "Channel" c
      LEFT JOIN "Video" v ON v."channelId" = c.id
      ${whereSql}
      GROUP BY c.id
      ORDER BY "totalVideos" DESC, c.name ASC
      LIMIT 300
      `,
      ...params
    );

    return NextResponse.json({ channels: rows });
  } catch {
    return NextResponse.json({ error: "Failed to load channels." }, { status: 500 });
  }
}

