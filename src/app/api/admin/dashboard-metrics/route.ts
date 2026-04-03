import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        totalUsers: number;
        totalVideos: number;
        totalViews: number;
        totalLikes: number;
        totalComments: number;
        activeListings: number;
      }>
    >(`
      SELECT
        (SELECT COUNT(*)::int FROM "User") AS "totalUsers",
        (SELECT COUNT(*)::int FROM "Video") AS "totalVideos",
        (SELECT COALESCE(SUM("viewsCount"), 0)::int FROM "Video") AS "totalViews",
        (SELECT COALESCE(SUM("likesCount"), 0)::int FROM "Video") AS "totalLikes",
        (SELECT COUNT(*)::int FROM "Comment") AS "totalComments",
        (SELECT COUNT(*)::int FROM "Property") AS "activeListings"
    `);
    const m = rows?.[0];
    return NextResponse.json({
      totalUsers: m?.totalUsers ?? 0,
      totalVideos: m?.totalVideos ?? 0,
      totalViews: m?.totalViews ?? 0,
      totalLikes: m?.totalLikes ?? 0,
      totalComments: m?.totalComments ?? 0,
      activeListings: m?.activeListings ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load metrics." }, { status: 500 });
  }
}
