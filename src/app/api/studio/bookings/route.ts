import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** List visit bookings for the signed-in channel owner (agent). */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { channel: { select: { id: true } } },
    });
    if (!user?.channel) {
      return NextResponse.json({ error: "No channel" }, { status: 404 });
    }

    const agentUserId = user.id;
    const url = new URL(req.url);
    const updatedAfter = url.searchParams.get("updatedAfter");
    const take = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);

    const updatedFilter =
      updatedAfter && !Number.isNaN(Date.parse(updatedAfter))
        ? { updatedAt: { gt: new Date(updatedAfter) } }
        : {};

    const rows = await prisma.visitBooking.findMany({
      where: { agentUserId, ...updatedFilter },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take,
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            channelId: true,
          },
        },
        visitor: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        property: {
          select: {
            id: true,
            city: true,
            country: true,
          },
        },
      },
    });

    return NextResponse.json({
      bookings: rows.map((b) => ({
        id: b.id,
        status: b.status,
        scheduledAt: b.scheduledAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        createdAt: b.createdAt.toISOString(),
        visitorName: b.visitorName,
        visitorPhone: b.visitorPhone,
        visitorEmail: b.visitorEmail,
        message: b.message,
        visitorUserId: b.visitorUserId,
        video: b.video,
        propertyLabel: b.property
          ? [b.property.city, b.property.country].filter(Boolean).join(", ")
          : null,
      })),
    });
  } catch (e) {
    console.error("[studio/bookings GET]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
