import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { whatsappDigits } from "@/lib/crmContactLinks";
import { notifyAgentVisitorRescheduleInteraction } from "@/lib/bookingNotify";
import { formatVisitDateTimeForMessage } from "@/lib/bookingFormat";

export const dynamic = "force-dynamic";

const bookingInclude = {
  video: {
    select: {
      id: true,
      title: true,
      thumbnail: true,
      channelId: true,
    },
  },
  property: {
    select: {
      id: true,
      city: true,
      country: true,
    },
  },
  visitor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      fullPhoneNumber: true,
      phone: true,
      phoneNumber: true,
      phoneCode: true,
      whatsapp: true,
    },
  },
  agent: {
    select: {
      id: true,
      fullName: true,
      email: true,
      fullPhoneNumber: true,
      phone: true,
      phoneNumber: true,
      phoneCode: true,
      whatsapp: true,
    },
  },
} satisfies Prisma.VisitBookingInclude;

type BookingLoaded = Prisma.VisitBookingGetPayload<{ include: typeof bookingInclude }>;

function bookingPhoneDigitsSafe(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

function serializeBooking(b: BookingLoaded, role: "visitor" | "agent") {
  const propertyLabel = b.property
    ? [b.property.city, b.property.country].filter(Boolean).join(", ")
    : null;

  const visitorWa = bookingPhoneDigitsSafe(b.visitorPhone);
  const agentWa = whatsappDigits(b.agent);

  return {
    id: b.id,
    role,
    status: b.status,
    scheduledAt: b.scheduledAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
    visitorName: b.visitorName,
    visitorPhone: b.visitorPhone,
    visitorEmail: b.visitorEmail,
    message: b.message,
    responseMessage: b.responseMessage,
    reschedulePendingFrom: b.reschedulePendingFrom?.toISOString() ?? null,
    statusBeforePendingReschedule: b.statusBeforePendingReschedule,
    visitorCounterProposalAt: b.visitorCounterProposalAt?.toISOString() ?? null,
    video: { id: b.video.id, title: b.video.title, thumbnail: b.video.thumbnail },
    propertyLabel,
    contact:
      role === "agent"
        ? { visitorWhatsAppDigits: visitorWa }
        : { agentWhatsAppDigits: agentWa },
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const b = await prisma.visitBooking.findUnique({
      where: { id },
      include: bookingInclude,
    });

    if (!b) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (b.visitorUserId === userId) {
      return NextResponse.json({ booking: serializeBooking(b, "visitor") });
    }
    if (b.agentUserId === userId) {
      return NextResponse.json({ booking: serializeBooking(b, "agent") });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (e) {
    console.error("[bookings/[id] GET]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.visitBooking.findFirst({
      where: { id, visitorUserId: userId },
      include: {
        video: { select: { title: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (action === "acceptReschedule") {
      if (existing.status !== "RESCHEDULED") {
        return NextResponse.json({ error: "No pending reschedule to accept" }, { status: 400 });
      }

      const updated = await prisma.visitBooking.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          reschedulePendingFrom: null,
          statusBeforePendingReschedule: null,
          visitorCounterProposalAt: null,
        },
        include: bookingInclude,
      });

      void notifyAgentVisitorRescheduleInteraction({
        bookingId: updated.id,
        agentUserId: updated.agentUserId,
        videoTitle: updated.video.title,
        visitorName: updated.visitorName,
        kind: "accepted",
        whenLabel: formatVisitDateTimeForMessage(updated.scheduledAt),
      });

      return NextResponse.json({ booking: serializeBooking(updated, "visitor") });
    }

    if (action === "rejectReschedule") {
      if (!existing.reschedulePendingFrom) {
        return NextResponse.json({ error: "Nothing to reject" }, { status: 400 });
      }

      const restoreAt = existing.reschedulePendingFrom;
      const restoreStatus = existing.statusBeforePendingReschedule ?? "PENDING";

      const updated = await prisma.visitBooking.update({
        where: { id },
        data: {
          scheduledAt: restoreAt,
          status: restoreStatus,
          reschedulePendingFrom: null,
          statusBeforePendingReschedule: null,
          visitorCounterProposalAt: null,
        },
        include: bookingInclude,
      });

      void notifyAgentVisitorRescheduleInteraction({
        bookingId: updated.id,
        agentUserId: updated.agentUserId,
        videoTitle: updated.video.title,
        visitorName: updated.visitorName,
        kind: "rejected",
      });

      return NextResponse.json({ booking: serializeBooking(updated, "visitor") });
    }

    if (action === "proposeTime") {
      if (existing.status !== "RESCHEDULED" || !existing.reschedulePendingFrom) {
        return NextResponse.json({ error: "Reschedule a visit before suggesting a new time" }, { status: 400 });
      }

      const scheduledAtRaw = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";
      if (!scheduledAtRaw) {
        return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
      }

      const proposed = new Date(scheduledAtRaw);
      if (Number.isNaN(proposed.getTime())) {
        return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
      }
      if (proposed.getTime() < Date.now() - 60_000) {
        return NextResponse.json({ error: "Visit time must be in the future" }, { status: 400 });
      }

      const updated = await prisma.visitBooking.update({
        where: { id },
        data: {
          visitorCounterProposalAt: proposed,
        },
        include: bookingInclude,
      });

      void notifyAgentVisitorRescheduleInteraction({
        bookingId: updated.id,
        agentUserId: updated.agentUserId,
        videoTitle: updated.video.title,
        visitorName: updated.visitorName,
        kind: "counter",
        whenLabel: formatVisitDateTimeForMessage(proposed),
      });

      return NextResponse.json({ booking: serializeBooking(updated, "visitor") });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[bookings/[id] PATCH]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
