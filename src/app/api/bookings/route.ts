import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { notifyAgentNewVisitBooking, notifyVisitorBookingCreated } from "@/lib/bookingNotify";
import { whatsappDigits } from "@/lib/crmContactLinks";
import { buildBookingWhatsAppHref } from "@/lib/bookingWaMe";

export const dynamic = "force-dynamic";

const NAME_MIN = 2;
const PHONE_MIN_DIGITS = 8;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function phoneDigitCount(s: string): number {
  return s.replace(/\D/g, "").length;
}

function siteBaseUrl(): string {
  const u = process.env.NEXTAUTH_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (!u) return "";
  if (u.startsWith("http")) return u.replace(/\/$/, "");
  return `https://${u.replace(/\/$/, "")}`;
}

function requestLocale(req: Request): string {
  const al = req.headers.get("accept-language") || "";
  return al.split(",")[0]?.trim() || "en";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const visitorUserId = session?.user?.id as string | undefined;
    if (!visitorUserId) {
      return NextResponse.json({ error: "Sign in to book a visit" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    const visitorName = typeof body.visitorName === "string" ? body.visitorName.trim() : "";
    const visitorPhone = typeof body.visitorPhone === "string" ? body.visitorPhone.trim() : "";
    const visitorEmailRaw = typeof body.visitorEmail === "string" ? body.visitorEmail.trim() : "";
    const visitorEmail = visitorEmailRaw.length ? visitorEmailRaw : null;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : null;
    const scheduledAtRaw = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";

    if (!videoId) {
      return NextResponse.json({ error: "Video is required" }, { status: 400 });
    }
    if (visitorName.length < NAME_MIN) {
      return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
    }
    if (phoneDigitCount(visitorPhone) < PHONE_MIN_DIGITS) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }
    if (visitorEmail && !isValidEmail(visitorEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (!scheduledAtRaw) {
      return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
    }

    const scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid date or time" }, { status: 400 });
    }
    const minTime = Date.now() - 60_000;
    if (scheduledAt.getTime() < minTime) {
      return NextResponse.json({ error: "Visit time must be in the future" }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        property: true,
        channel: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                fullPhoneNumber: true,
                phone: true,
                phoneNumber: true,
                phoneCode: true,
                whatsapp: true,
              },
            },
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const agentUserId = video.channel.ownerId;
    if (agentUserId === visitorUserId) {
      return NextResponse.json({ error: "You cannot book a visit on your own listing" }, { status: 400 });
    }

    const propertyId = video.property?.id ?? null;
    const locationLine = video.property
      ? [video.property.city, video.property.country].filter(Boolean).join(", ")
      : "";

    const booking = await prisma.visitBooking.create({
      data: {
        videoId: video.id,
        propertyId,
        visitorUserId,
        agentUserId,
        visitorName,
        visitorPhone,
        visitorEmail,
        scheduledAt,
        message: message || null,
      },
    });

    void notifyVisitorBookingCreated({
      booking,
      videoTitle: video.title,
      localeTag: requestLocale(req),
    });

    void notifyAgentNewVisitBooking({
      booking,
      agentEmail: video.channel.owner.email,
      videoTitle: video.title,
      locationLine,
      agentPhoneUser: video.channel.owner,
      localeTag: requestLocale(req),
    });

    const agentDigits = whatsappDigits(video.channel.owner);
    const base = siteBaseUrl();
    const visitUrl = base ? `${base}/visits/${booking.id}` : undefined;
    const whatsappToAgentUrl =
      agentDigits ? buildBookingWhatsAppHref(agentDigits, video.title, booking.scheduledAt, requestLocale(req), visitUrl) : null;

    return NextResponse.json(
      {
        ok: true,
        booking: {
          id: booking.id,
          status: booking.status,
          scheduledAt: booking.scheduledAt.toISOString(),
        },
        whatsappToAgentUrl,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[bookings POST]", e);
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }
}
