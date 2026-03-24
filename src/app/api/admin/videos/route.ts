import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

function asString(v: string | null) {
  return (v || "").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = asString(searchParams.get("filter")); // shorts | long | mostViewed | all
    const search = asString(searchParams.get("search"));
    const status = asString(searchParams.get("status")) as ModerationStatus | "";

    const where: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(v.title ILIKE $${params.length})`);
    }

    if (status) {
      params.push(status);
      where.push(`(v."moderationStatus" = $${params.length})`);
    }

    if (filter === "shorts") where.push(`(v."isShort" = true)`);
    if (filter === "long") where.push(`(v."isShort" = false)`);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderSql =
      filter === "mostViewed"
        ? `ORDER BY v."viewsCount" DESC, v."createdAt" DESC`
        : `ORDER BY v."createdAt" DESC`;

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        thumbnail: string | null;
        viewsCount: number;
        likesCount: number;
        isShort: boolean;
        moderationStatus: ModerationStatus;
        createdAt: Date;
        channelName: string;
      }>
    >(
      `
      SELECT
        v.id,
        v.title,
        v.thumbnail,
        v."viewsCount",
        v."likesCount",
        v."isShort",
        v."moderationStatus",
        v."createdAt",
        c.name as "channelName"
      FROM "Video" v
      JOIN "Channel" c ON c.id = v."channelId"
      ${whereSql}
      ${orderSql}
      LIMIT 300
      `,
      ...params
    );

    return NextResponse.json({
      videos: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load videos." }, { status: 500 });
  }
}

