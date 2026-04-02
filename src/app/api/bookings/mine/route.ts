import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** List visit bookings for the signed-in visitor (user profile — My Visits). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const visitorUserId = session?.user?.id as string | undefined;
    if (!visitorUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.visitBooking.findMany({
      where: { visitorUserId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 100,
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
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
        responseMessage: b.responseMessage,
        message: b.message,
        reschedulePendingFrom: b.reschedulePendingFrom?.toISOString() ?? null,
        visitorCounterProposalAt: b.visitorCounterProposalAt?.toISOString() ?? null,
        video: b.video,
        propertyLabel: b.property
          ? [b.property.city, b.property.country].filter(Boolean).join(", ")
          : null,
      })),
    });
  } catch (e) {
    console.error("[bookings/mine GET]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
