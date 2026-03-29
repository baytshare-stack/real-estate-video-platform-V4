import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { markNotificationsReadForUser } from "@/lib/notifications";

const MAX_LIMIT = 20;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "15", 10) || 15, 1),
      MAX_LIMIT
    );
    const cursor = url.searchParams.get("cursor");

    let cursorWhere: object = {};
    if (cursor) {
      const last = await prisma.notification.findFirst({
        where: { id: cursor, userId },
        select: { id: true, createdAt: true },
      });
      if (!last) {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }
      cursorWhere = {
        OR: [
          { createdAt: { lt: last.createdAt } },
          { AND: [{ createdAt: last.createdAt }, { id: { lt: last.id } }] },
        ],
      };
    }

    const rows = await prisma.notification.findMany({
      where: { userId, ...cursorWhere },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        type: true,
        message: true,
        isRead: true,
        createdAt: true,
        linkUrl: true,
      },
    });

    const hasMore = rows.length > limit;
    const notifications = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? notifications[notifications.length - 1]?.id ?? null : null;

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json(
      { notifications, unreadCount, nextCursor },
      { status: 200 }
    );
  } catch (error) {
    console.error("Notifications API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id : undefined;
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : undefined;
    const all = body?.all === true;

    if (!all && !id && (!ids || !ids.length)) {
      return NextResponse.json(
        { error: "Provide id, ids, or all: true" },
        { status: 400 }
      );
    }

    await markNotificationsReadForUser(userId, { id, ids, all });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ ok: true, unreadCount }, { status: 200 });
  } catch (error) {
    console.error("Notifications POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
