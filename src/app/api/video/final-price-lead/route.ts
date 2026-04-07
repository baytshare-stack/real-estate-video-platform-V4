import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { createNotification, NOTIFICATION_TYPES, watchVideoUrl } from "@/lib/notifications";
import { countDialDigits, normalizePhoneDigits } from "@/lib/normalizePhoneInput";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildSpecifications(video: {
  title: string;
  property: {
    bedrooms: number | null;
    bathrooms: number | null;
    sizeSqm: number | null;
    city: string;
    country: string;
    status: string;
    propertyType: string;
  } | null;
}): string {
  const parts: string[] = [];
  parts.push(`العنوان: ${video.title}`);
  if (video.property) {
    const p = video.property;
    parts.push(`النوع: ${p.propertyType}`);
    parts.push(`الحالة: ${p.status}`);
    parts.push(`الموقع: ${p.city}, ${p.country}`);
    if (p.bedrooms != null) parts.push(`غرف النوم: ${p.bedrooms}`);
    if (p.bathrooms != null) parts.push(`الحمامات: ${p.bathrooms}`);
    if (p.sizeSqm != null) parts.push(`المساحة: ${p.sizeSqm} م²`);
  }
  return parts.join(" | ");
}

export async function POST(req: Request) {
  try {
    let body: { videoId?: string; visitorName?: string; visitorPhone?: string };
    try {
      body = (await req.json()) as { videoId?: string; visitorName?: string; visitorPhone?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const videoId = (body.videoId || "").trim();
    const visitorName = (body.visitorName || "").trim();
    const visitorPhoneRaw = (body.visitorPhone || "").trim();
    const visitorPhone = normalizePhoneDigits(visitorPhoneRaw);

    if (!videoId || !visitorName || !visitorPhoneRaw) {
      return NextResponse.json(
        { error: "videoId, visitorName, and visitorPhone are required." },
        { status: 400 }
      );
    }
    if (visitorName.length < 2) {
      return NextResponse.json({ error: "Name is too short." }, { status: 400 });
    }
    if (countDialDigits(visitorPhone) < 5) {
      return NextResponse.json(
        { error: "Please enter a valid phone number (at least 5 digits)." },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        channel: { select: { ownerId: true } },
        property: true,
      },
    });

    if (!video || !video.channel) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    const listedPriceLabel =
      video.property?.price != null
        ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(video.property.price))} ${video.property.currency || "USD"}`
        : "—";

    const specifications = buildSpecifications({
      title: video.title,
      property: video.property
        ? {
            bedrooms: video.property.bedrooms,
            bathrooms: video.property.bathrooms,
            sizeSqm: video.property.sizeSqm,
            city: video.property.city,
            country: video.property.country,
            status: video.property.status,
            propertyType: video.property.propertyType,
          }
        : null,
    });

    let visitorUserId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      const raw = session?.user?.id;
      if (typeof raw === "string") {
        const id = raw.trim();
        if (id.length > 0) {
          const u = await prisma.user.findUnique({ where: { id }, select: { id: true } });
          if (u) visitorUserId = u.id;
        }
      }
    } catch (sessionErr) {
      console.warn("final-price-lead: session skipped", sessionErr);
    }

    const agentUserId = video.channel.ownerId;

    await prisma.finalPriceLead.create({
      data: {
        videoId,
        agentUserId,
        visitorName,
        visitorPhone: visitorPhone.trim(),
        specifications,
        listedPriceLabel,
        visitorUserId,
      },
    });

    const titleShort = video.title.length > 60 ? `${video.title.slice(0, 57)}…` : video.title;
    await createNotification({
      userId: agentUserId,
      type: NOTIFICATION_TYPES.FINAL_PRICE_LEAD_REQUEST,
      message: `طلب سعر نهائي: ${visitorName} — ${titleShort}`,
      linkUrl: watchVideoUrl(videoId),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("final-price-lead", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2021" || e.code === "P2010") {
        return NextResponse.json(
          {
            error:
              "قاعدة البيانات غير محدثة (جدول طلبات السعر). نفّذ على الخادم: npx prisma migrate deploy ثم أعد تشغيل التطبيق.",
          },
          { status: 503 }
        );
      }
    }
    const msg = e instanceof Error ? e.message : String(e);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Failed to submit request.",
        ...(isDev && msg ? { detail: msg } : {}),
      },
      { status: 500 }
    );
  }
}
