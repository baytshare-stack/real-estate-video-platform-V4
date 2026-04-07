import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import {
  notifyVisitorVisitBookingStatus,
  notifyVisitorVisitRescheduled,
} from "@/lib/bookingNotify";
import type { VisitBookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: VisitBookingStatus[] = ["PENDING", "ACCEPTED", "REJECTED", "RESCHEDULED"];

function requestLocale(req: Request): string {
  const al = req.headers.get("accept-language") || "";
  return al.split(",")[0]?.trim() || "en";
}

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
    const acceptVisitorProposal = body.acceptVisitorProposal === true;

    if (acceptVisitorProposal) {
      if (!existing.visitorCounterProposalAt) {
        return NextResponse.json({ error: "No visitor time proposal" }, { status: 400 });
      }

      const prevStatus = existing.status;
      const prevScheduled = existing.scheduledAt.getTime();

      const updated = await prisma.visitBooking.update({
        where: { id: bookingId },
        data: {
          scheduledAt: existing.visitorCounterProposalAt,
          status: "ACCEPTED",
          visitorCounterProposalAt: null,
          reschedulePendingFrom: null,
          statusBeforePendingReschedule: null,
        },
        include: {
          video: { select: { title: true } },
          visitor: { select: { email: true } },
        },
      });

      const visitorEmail = updated.visitorEmail?.trim() || updated.visitor.email || null;
      const statusChanged = updated.status !== prevStatus;
      const timeChanged = updated.scheduledAt.getTime() !== prevScheduled;

      if (statusChanged && updated.status === "ACCEPTED") {
        void notifyVisitorVisitBookingStatus({
          booking: updated,
          videoTitle: updated.video.title,
          visitorEmail,
          localeTag: requestLocale(req),
        });
      } else if (timeChanged && updated.status !== "ACCEPTED") {
        void notifyVisitorVisitRescheduled({
          booking: updated,
          videoTitle: updated.video.title,
          visitorEmail,
          localeTag: requestLocale(req),
        });
      }

      return NextResponse.json({
        booking: {
          id: updated.id,
          status: updated.status,
          scheduledAt: updated.scheduledAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          responseMessage: updated.responseMessage,
          reschedulePendingFrom: updated.reschedulePendingFrom?.toISOString() ?? null,
          statusBeforePendingReschedule: updated.statusBeforePendingReschedule,
          visitorCounterProposalAt: updated.visitorCounterProposalAt?.toISOString() ?? null,
        },
      });
    }

    const statusIn = body.status;
    const scheduledAtRaw = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";
    const responseRaw = body.responseMessage;
    let responseMessage: string | null | undefined;
    if (typeof responseRaw === "string") {
      responseMessage = responseRaw.trim().slice(0, 2000);
    } else if (responseRaw === null) {
      responseMessage = null;
    }

    const prevStatus = existing.status;
    const prevScheduled = existing.scheduledAt.getTime();

    const data: {
      status?: VisitBookingStatus;
      scheduledAt?: Date;
      responseMessage?: string | null;
      reschedulePendingFrom?: Date | null;
      statusBeforePendingReschedule?: VisitBookingStatus | null;
      visitorCounterProposalAt?: Date | null;
    } = {};

    if (typeof statusIn === "string" && STATUSES.includes(statusIn as VisitBookingStatus)) {
      data.status = statusIn as VisitBookingStatus;
    }

    if (scheduledAtRaw) {
      const d = new Date(scheduledAtRaw);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
      }
      const minTime = Date.now() - 60_000;
      if (d.getTime() < minTime) {
        return NextResponse.json({ error: "Visit time must be in the future" }, { status: 400 });
      }
      data.scheduledAt = d;
    }

    if (responseMessage !== undefined) {
      data.responseMessage = responseMessage && responseMessage.length ? responseMessage : null;
    }

    if (data.status === undefined && data.scheduledAt === undefined && data.responseMessage === undefined) {
      return NextResponse.json({ error: "Provide status, scheduledAt, and/or responseMessage" }, { status: 400 });
    }

    const timeWillChange =
      data.scheduledAt !== undefined && data.scheduledAt.getTime() !== prevScheduled;

    if (timeWillChange) {
      data.status = "RESCHEDULED";
      data.reschedulePendingFrom = existing.scheduledAt;
      data.statusBeforePendingReschedule = existing.status;
      data.visitorCounterProposalAt = null;
    }

    if (data.status === "ACCEPTED") {
      data.reschedulePendingFrom = null;
      data.statusBeforePendingReschedule = null;
      data.visitorCounterProposalAt = null;
    }

    if (data.status === "REJECTED") {
      data.visitorCounterProposalAt = null;
      data.reschedulePendingFrom = null;
      data.statusBeforePendingReschedule = null;
    }

    const updated = await prisma.visitBooking.update({
      where: { id: bookingId },
      data,
      include: {
        video: { select: { title: true } },
        visitor: { select: { email: true } },
      },
    });

    const statusChanged = updated.status !== prevStatus;
    const timeChanged = updated.scheduledAt.getTime() !== prevScheduled;
    const visitorEmail = updated.visitorEmail?.trim() || updated.visitor.email || null;

    if (statusChanged && updated.status === "REJECTED") {
      void notifyVisitorVisitBookingStatus({
        booking: updated,
        videoTitle: updated.video.title,
        visitorEmail,
        localeTag: requestLocale(req),
      });
    } else if (statusChanged && updated.status === "ACCEPTED") {
      void notifyVisitorVisitBookingStatus({
        booking: updated,
        videoTitle: updated.video.title,
        visitorEmail,
        localeTag: requestLocale(req),
      });
    } else if (timeChanged) {
      void notifyVisitorVisitRescheduled({
        booking: updated,
        videoTitle: updated.video.title,
        visitorEmail,
        localeTag: requestLocale(req),
      });
    }

    return NextResponse.json({
      booking: {
        id: updated.id,
        status: updated.status,
        scheduledAt: updated.scheduledAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        responseMessage: updated.responseMessage,
        reschedulePendingFrom: updated.reschedulePendingFrom?.toISOString() ?? null,
        statusBeforePendingReschedule: updated.statusBeforePendingReschedule,
        visitorCounterProposalAt: updated.visitorCounterProposalAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error("[studio/bookings PATCH]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
