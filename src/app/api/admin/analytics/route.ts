import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ChartPoint = { day: string; value: number };

export async function GET() {
  try {
    const totalsRows = await prisma.$queryRawUnsafe<
      Array<{
        totalUsers: number;
        totalVideos: number;
        totalViews: number;
        totalLikes: number;
      }>
    >(
      `
      SELECT
        (SELECT COUNT(*)::int FROM "User") as "totalUsers",
        (SELECT COUNT(*)::int FROM "Video") as "totalVideos",
        (SELECT COALESCE(SUM("viewsCount"),0)::int FROM "Video") as "totalViews",
        (SELECT COALESCE(SUM("likesCount"),0)::int FROM "Video") as "totalLikes"
      `
    );

    const totals = totalsRows?.[0] || { totalUsers: 0, totalVideos: 0, totalViews: 0, totalLikes: 0 };

    const userGrowthRows = await prisma.$queryRawUnsafe<
      Array<{ day: Date; count: number }>
    >(
      `
      SELECT
        gs.day::date as "day",
        COALESCE(COUNT(u.id), 0)::int as count
      FROM generate_series(
        current_date - interval '13 day',
        current_date,
        interval '1 day'
      ) gs(day)
      LEFT JOIN "User" u
        ON u."createdAt"::date = gs.day::date
      GROUP BY gs.day
      ORDER BY gs.day
      `
    );

    const videoPerfRows = await prisma.$queryRawUnsafe<
      Array<{ day: Date; views: number }>
    >(
      `
      SELECT
        gs.day::date as "day",
        COALESCE(SUM(v."viewsCount"), 0)::int as views
      FROM generate_series(
        current_date - interval '13 day',
        current_date,
        interval '1 day'
      ) gs(day)
      LEFT JOIN "Video" v
        ON v."createdAt"::date = gs.day::date
      GROUP BY gs.day
      ORDER BY gs.day
      `
    );

    const topChannelsRows = await prisma.$queryRawUnsafe<
      Array<{ channelName: string; views: number }>
    >(
      `
      SELECT
        c.name as "channelName",
        COALESCE(SUM(v."viewsCount"), 0)::int as views
      FROM "Channel" c
      LEFT JOIN "Video" v
        ON v."channelId" = c.id
      GROUP BY c.id, c.name
      ORDER BY views DESC
      LIMIT 5
      `
    );

    const userGrowth: ChartPoint[] = userGrowthRows.map((r) => ({
      day: r.day.toISOString(),
      value: r.count,
    }));
    const videoPerformance: ChartPoint[] = videoPerfRows.map((r) => ({
      day: r.day.toISOString(),
      value: r.views,
    }));

    return NextResponse.json({
      totals,
      userGrowth,
      videoPerformance,
      topChannels: topChannelsRows.map((r) => ({
        channelName: r.channelName,
        views: r.views,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}

