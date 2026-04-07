import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Visitor's bookings (for polling / history). */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const updatedAfter = url.searchParams.get("updatedAfter");
    const cursor = url.searchParams.get("cursor");
    const take = Math.min(parseInt(url.searchParams.get("limit") || "30", 10) || 30, 100);

    const updatedFilter =
      updatedAfter && !Number.isNaN(Date.parse(updatedAfter))
        ? { updatedAt: { gt: new Date(updatedAfter) } }
        : {};

    let cursorWhere: object = {};
    if (cursor) {
      const last = await prisma.visitBooking.findFirst({
        where: { visitorUserId: userId, id: cursor },
        select: { id: true, updatedAt: true },
      });
      if (!last) {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }
      cursorWhere = {
        OR: [
          { updatedAt: { lt: last.updatedAt } },
          { AND: [{ updatedAt: last.updatedAt }, { id: { lt: last.id } }] },
        ],
      };
    }

    const rows = await prisma.visitBooking.findMany({
      where: { visitorUserId: userId, ...updatedFilter, ...cursorWhere },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: take + 1,
      include: {
        video: { select: { id: true, title: true, thumbnail: true } },
      },
    });

    const hasMore = rows.length > take;
    const bookings = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? bookings[bookings.length - 1]?.id ?? null : null;

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        scheduledAt: b.scheduledAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        visitorName: b.visitorName,
        visitorPhone: b.visitorPhone,
        visitorEmail: b.visitorEmail,
        message: b.message,
        video: b.video,
      })),
      nextCursor,
    });
  } catch (e) {
    console.error("[bookings/me GET]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
