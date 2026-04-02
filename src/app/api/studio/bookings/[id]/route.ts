import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { notifyVisitorVisitBookingStatus, notifyVisitorVisitRescheduled } from "@/lib/bookingNotify";
import type { VisitBookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: VisitBookingStatus[] = ["PENDING", "ACCEPTED", "REJECTED"];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await ctx.params;
    if (!bookingId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.visitBooking.findFirst({
      where: { id: bookingId, agentUserId: user.id },
      include: {
        video: { select: { title: true } },
        visitor: { select: { email: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const statusIn = body.status;
    const scheduledAtRaw = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";

    const data: { status?: VisitBookingStatus; scheduledAt?: Date } = {};
    if (typeof statusIn === "string" && STATUSES.includes(statusIn as VisitBookingStatus)) {
      data.status = statusIn as VisitBookingStatus;
    }
    if (scheduledAtRaw) {
      const d = new Date(scheduledAtRaw);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
      }
      data.scheduledAt = d;
    }

    if (data.status === undefined && data.scheduledAt === undefined) {
      return NextResponse.json({ error: "Provide status and/or scheduledAt" }, { status: 400 });
    }

    const prevStatus = existing.status;
    const prevScheduled = existing.scheduledAt.getTime();

    const updated = await prisma.visitBooking.update({
      where: { id: bookingId },
      data,
      include: {
        video: { select: { title: true } },
        visitor: { select: { email: true } },
      },
    });

    const statusChanged = data.status !== undefined && data.status !== prevStatus;
    const timeChanged =
      data.scheduledAt !== undefined && updated.scheduledAt.getTime() !== prevScheduled;
    const visitorEmail = updated.visitorEmail?.trim() || updated.visitor.email || null;

    if (statusChanged) {
      void notifyVisitorVisitBookingStatus({
        booking: updated,
        videoTitle: updated.video.title,
        visitorEmail,
      });
    } else if (timeChanged) {
      void notifyVisitorVisitRescheduled({
        booking: updated,
        videoTitle: updated.video.title,
        visitorEmail,
      });
    }

    return NextResponse.json({
      booking: {
        id: updated.id,
        status: updated.status,
        scheduledAt: updated.scheduledAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[studio/bookings PATCH]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
