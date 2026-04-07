import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { markNotificationsReadForUser } from "@/lib/notifications";

export async function PUT(req: Request) {
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
    console.error("Notifications read PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
