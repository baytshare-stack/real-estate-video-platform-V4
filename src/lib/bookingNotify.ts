import type { VisitBooking, VisitBookingStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email/send";
import { getEmailTransportConfig } from "@/lib/email/config";
import { createNotification, NOTIFICATION_TYPES, watchVideoUrl } from "@/lib/notifications";
import { whatsappUrl } from "@/lib/crmContactLinks";

function siteBaseUrl(): string {
  const u = process.env.NEXTAUTH_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (!u) return "";
  if (u.startsWith("http")) return u.replace(/\/$/, "");
  return `https://${u.replace(/\/$/, "")}`;
}

export function formatBookingDetailText(params: {
  videoTitle: string;
  locationLine: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail: string | null;
  scheduledAt: Date;
  message: string | null;
  status?: VisitBookingStatus;
}): string {
  const when = params.scheduledAt.toISOString();
  const lines = [
    `Property / video: ${params.videoTitle}`,
    `Location: ${params.locationLine || "—"}`,
    `Visitor: ${params.visitorName}`,
    `Phone: ${params.visitorPhone}`,
    params.visitorEmail ? `Email: ${params.visitorEmail}` : null,
    `Requested time (UTC): ${when}`,
    params.message ? `Message: ${params.message}` : null,
    params.status ? `Status: ${params.status}` : null,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export async function notifyAgentNewVisitBooking(params: {
  booking: VisitBooking;
  agentEmail: string;
  videoTitle: string;
  locationLine: string;
}) {
  const detail = formatBookingDetailText({
    videoTitle: params.videoTitle,
    locationLine: params.locationLine,
    visitorName: params.booking.visitorName,
    visitorPhone: params.booking.visitorPhone,
    visitorEmail: params.booking.visitorEmail,
    scheduledAt: params.booking.scheduledAt,
    message: params.booking.message,
  });

  const base = siteBaseUrl();
  const studioLink = base ? `${base}/studio` : "/studio";
  const watchLink = watchVideoUrl(params.booking.videoId);

  await createNotification({
    userId: params.booking.agentUserId,
    type: NOTIFICATION_TYPES.VISIT_BOOKING_NEW,
    message: `New visit request: ${params.booking.visitorName} — ${params.videoTitle}`,
    linkUrl: studioLink,
  });

  const visitorWa = digitsOnly(params.booking.visitorPhone);
  const waLink =
    visitorWa.length >= 8
      ? whatsappUrl(
          visitorWa,
          `Hi ${params.booking.visitorName}, regarding your visit request for "${params.videoTitle}".`
        )
      : null;

  const html = `
    <h2>New property visit request</h2>
    <pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(detail)}</pre>
    <p><a href="${escapeHtml(studioLink)}">Open Studio</a> · <a href="${escapeHtml(base ? base + watchLink : watchLink)}">View listing</a></p>
    ${
      waLink
        ? `<p><a href="${escapeHtml(waLink)}">WhatsApp the visitor</a> (prefilled message)</p>`
        : ""
    }
  `.trim();

  const cfg = getEmailTransportConfig();
  if (!cfg.ok) {
    console.warn("[bookingNotify] email not configured; in-app notification only");
    return;
  }

  try {
    await sendEmail({
      to: params.agentEmail,
      subject: `Visit request: ${params.booking.visitorName} — ${params.videoTitle}`,
      text: `${detail}\n\nStudio: ${studioLink}\nListing: ${base ? base + watchLink : watchLink}${waLink ? `\nWhatsApp visitor: ${waLink}` : ""}`,
      html,
    });
  } catch (e) {
    console.error("[bookingNotify] agent email failed", e);
  }
}

export async function notifyVisitorVisitRescheduled(params: {
  booking: VisitBooking;
  videoTitle: string;
  visitorEmail: string | null;
}) {
  const when = params.booking.scheduledAt.toISOString();
  const msg = `Your visit for "${params.videoTitle}" was rescheduled to ${when} (UTC).`;

  await createNotification({
    userId: params.booking.visitorUserId,
    type: NOTIFICATION_TYPES.VISIT_BOOKING_STATUS,
    message: msg,
    linkUrl: watchVideoUrl(params.booking.videoId),
  });

  const to = params.visitorEmail?.trim();
  if (!to) return;

  const cfg = getEmailTransportConfig();
  if (!cfg.ok) return;

  try {
    await sendEmail({
      to,
      subject: `Visit rescheduled: ${params.videoTitle}`,
      text: msg,
      html: `<p>${escapeHtml(msg)}</p>`,
    });
  } catch (e) {
    console.error("[bookingNotify] visitor reschedule email failed", e);
  }
}

export async function notifyVisitorVisitBookingStatus(params: {
  booking: VisitBooking;
  videoTitle: string;
  visitorEmail: string | null;
}) {
  const { booking } = params;
  const label =
    booking.status === "ACCEPTED"
      ? "accepted"
      : booking.status === "REJECTED"
        ? "declined"
        : "updated";

  const whenLocal = booking.scheduledAt.toISOString();
  const msg = `Your visit request for "${params.videoTitle}" was ${label}. Scheduled: ${whenLocal}.`;

  await createNotification({
    userId: booking.visitorUserId,
    type: NOTIFICATION_TYPES.VISIT_BOOKING_STATUS,
    message: msg,
    linkUrl: watchVideoUrl(booking.videoId),
  });

  const to = params.visitorEmail?.trim();
  if (!to) return;

  const cfg = getEmailTransportConfig();
  if (!cfg.ok) return;

  try {
    await sendEmail({
      to,
      subject: `Visit request ${label}: ${params.videoTitle}`,
      text: `${msg}\n\n${formatBookingDetailText({
        videoTitle: params.videoTitle,
        locationLine: "",
        visitorName: booking.visitorName,
        visitorPhone: booking.visitorPhone,
        visitorEmail: booking.visitorEmail,
        scheduledAt: booking.scheduledAt,
        message: booking.message,
        status: booking.status,
      })}`,
      html: `<p>${escapeHtml(msg)}</p>`,
    });
  } catch (e) {
    console.error("[bookingNotify] visitor email failed", e);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
