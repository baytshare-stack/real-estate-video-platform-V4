import type { VisitBooking, VisitBookingStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email/send";
import { getEmailTransportConfig } from "@/lib/email/config";
import { createNotification, NOTIFICATION_TYPES, visitBookingPath, watchVideoUrl } from "@/lib/notifications";
import { whatsappDigits, whatsappUrl } from "@/lib/crmContactLinks";
import { formatVisitDateTimeForMessage } from "@/lib/bookingFormat";
import { sendWhatsAppCloudText } from "@/lib/bookingWhatsApp";

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
  responseMessage?: string | null;
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
    params.responseMessage ? `Agent note: ${params.responseMessage}` : null,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function whenFormatted(d: Date): string {
  return formatVisitDateTimeForMessage(d, "en-GB");
}

function absoluteVisitUrl(bookingId: string): string {
  const base = siteBaseUrl();
  const path = visitBookingPath(bookingId);
  return base ? `${base}${path}` : path;
}

/** Visitor confirmation — in-app (+ optional email / WhatsApp). */
export async function notifyVisitorBookingCreated(params: {
  booking: VisitBooking;
  videoTitle: string;
}) {
  const when = whenFormatted(params.booking.scheduledAt);
  const msg = `Your visit request for "${params.videoTitle}" was submitted for ${when}. The agent will respond soon.`;

  await createNotification({
    userId: params.booking.visitorUserId,
    type: NOTIFICATION_TYPES.VISIT_BOOKING_SUBMITTED,
    message: msg,
    linkUrl: visitBookingPath(params.booking.id),
  });

  const to = params.booking.visitorEmail?.trim();
  const cfg = getEmailTransportConfig();
  if (to && cfg.ok) {
    try {
      await sendEmail({
        to,
        subject: `Visit request received: ${params.videoTitle}`,
        text: `${msg}\n\nYou can track status in your profile under My Visits.`,
        html: `<p>${escapeHtml(msg)}</p>`,
      });
    } catch (e) {
      console.error("[bookingNotify] visitor submit email failed", e);
    }
  }

  const wa = digitsOnly(params.booking.visitorPhone);
  if (wa.length >= 8) {
    const body = `Your visit request for "${params.videoTitle}" was submitted for ${when}. You will be notified when the agent responds.\nManage visit: ${absoluteVisitUrl(params.booking.id)}`;
    const sent = await sendWhatsAppCloudText(wa, body);
    if (!sent) {
      /* Link fallback is client-only; optional log */
    }
  }
}

export async function notifyAgentNewVisitBooking(params: {
  booking: VisitBooking;
  agentEmail: string;
  videoTitle: string;
  locationLine: string;
  agentPhoneUser?: Parameters<typeof whatsappDigits>[0] | null;
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
  const visitLink = visitBookingPath(params.booking.id);
  const when = whenFormatted(params.booking.scheduledAt);

  await createNotification({
    userId: params.booking.agentUserId,
    type: NOTIFICATION_TYPES.VISIT_BOOKING_NEW,
    message: `New visit request: ${params.booking.visitorName} — ${params.videoTitle} (${when})`,
    linkUrl: visitLink,
  });

  const visitorWa = digitsOnly(params.booking.visitorPhone);
  const waLink =
    visitorWa.length >= 8
      ? whatsappUrl(
          visitorWa,
          `Hi ${params.booking.visitorName}, regarding your visit request for "${params.videoTitle}" scheduled for ${when}.`
        )
      : null;

  const html = `
    <h2>New property visit request</h2>
    <pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(detail)}</pre>
    <p><a href="${escapeHtml(base ? base + visitLink : visitLink)}">Open booking</a> · <a href="${escapeHtml(studioLink)}">Studio</a> · <a href="${escapeHtml(base ? base + watchLink : watchLink)}">View listing</a></p>
    ${
      waLink
        ? `<p><a href="${escapeHtml(waLink)}">WhatsApp the visitor</a> (prefilled message)</p>`
        : ""
    }
  `.trim();

  const cfg = getEmailTransportConfig();
  if (!cfg.ok) {
    console.warn("[bookingNotify] email not configured; in-app notification only");
  } else {
    try {
      await sendEmail({
        to: params.agentEmail,
        subject: `Visit request: ${params.booking.visitorName} — ${params.videoTitle}`,
        text: `${detail}\n\nBooking: ${base ? base + visitLink : visitLink}\nStudio: ${studioLink}\nListing: ${base ? base + watchLink : watchLink}${waLink ? `\nWhatsApp visitor: ${waLink}` : ""}`,
        html,
      });
    } catch (e) {
      console.error("[bookingNotify] agent email failed", e);
    }
  }

  const agentDigits = params.agentPhoneUser ? whatsappDigits(params.agentPhoneUser) : null;
  if (agentDigits && agentDigits.length >= 8) {
    const body = `New visit request for "${params.videoTitle}" from ${params.booking.visitorName}. Proposed time: ${when}.\nOpen booking: ${absoluteVisitUrl(params.booking.id)}`;
    await sendWhatsAppCloudText(agentDigits, body);
  }
}

export async function notifyVisitorVisitRescheduled(params: {
  booking: VisitBooking;
  videoTitle: string;
  visitorEmail: string | null;
}) {
  const when = whenFormatted(params.booking.scheduledAt);
  const msg = `Your visit for "${params.videoTitle}" was rescheduled to ${when}. Open the visit to accept, decline, or suggest another time.`;
  const extra = params.booking.responseMessage?.trim()
    ? ` Agent message: ${params.booking.responseMessage.trim()}`
    : "";

  await createNotification({
    userId: params.booking.visitorUserId,
    type: NOTIFICATION_TYPES.VISIT_BOOKING_STATUS,
    message: msg + extra,
    linkUrl: visitBookingPath(params.booking.id),
  });

  const to = params.visitorEmail?.trim();
  const cfg = getEmailTransportConfig();
  if (to && cfg.ok) {
    try {
      await sendEmail({
        to,
        subject: `Visit rescheduled: ${params.videoTitle}`,
        text: `${msg}${extra}`,
        html: `<p>${escapeHtml(msg + extra)}</p>`,
      });
    } catch (e) {
      console.error("[bookingNotify] visitor reschedule email failed", e);
    }
  }

  const wa = digitsOnly(params.booking.visitorPhone);
  if (wa.length >= 8) {
    await sendWhatsAppCloudText(
      wa,
      `Your visit request for "${params.videoTitle}" has been rescheduled to ${when}.${params.booking.responseMessage?.trim() ? ` Note: ${params.booking.responseMessage.trim()}` : ""}\nManage visit: ${absoluteVisitUrl(params.booking.id)}`
    );
  }
}

function statusVisitorLabel(status: VisitBookingStatus): string {
  switch (status) {
    case "ACCEPTED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "RESCHEDULED":
      return "rescheduled";
    default:
      return "updated";
  }
}

export async function notifyVisitorVisitBookingStatus(params: {
  booking: VisitBooking;
  videoTitle: string;
  visitorEmail: string | null;
}) {
  const { booking } = params;
  const when = whenFormatted(booking.scheduledAt);
  const label = statusVisitorLabel(booking.status);
  const baseMsg = `Your visit request for "${params.videoTitle}" has been ${label} for ${when}.`;
  const tail = booking.responseMessage?.trim() ? ` ${booking.responseMessage.trim()}` : "";
  const msg = baseMsg + (booking.status === "REJECTED" && tail ? `\n\n${tail.trim()}` : tail ? ` ${tail.trim()}` : "");

  await createNotification({
    userId: booking.visitorUserId,
    type: NOTIFICATION_TYPES.VISIT_BOOKING_STATUS,
    message: msg.replace(/\n\n/g, " — "),
    linkUrl: visitBookingPath(booking.id),
  });

  const to = params.visitorEmail?.trim();
  const cfg = getEmailTransportConfig();
  if (to && cfg.ok) {
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
          responseMessage: booking.responseMessage,
        })}`,
        html: `<p>${escapeHtml(msg)}</p>`,
      });
    } catch (e) {
      console.error("[bookingNotify] visitor email failed", e);
    }
  }

  const wa = digitsOnly(booking.visitorPhone);
  if (wa.length >= 8) {
    const waBody =
      booking.status === "ACCEPTED"
        ? `Your visit request for "${params.videoTitle}" has been Approved on ${when}.${booking.responseMessage?.trim() ? ` ${booking.responseMessage.trim()}` : ""}`
        : booking.status === "REJECTED"
          ? `Your visit request for "${params.videoTitle}" has been Rejected.${booking.responseMessage?.trim() ? ` ${booking.responseMessage.trim()}` : ""}`
          : `Your visit request for "${params.videoTitle}" was ${label} for ${when}.${booking.responseMessage?.trim() ? ` ${booking.responseMessage.trim()}` : ""}`;
    await sendWhatsAppCloudText(wa, `${waBody}\nManage visit: ${absoluteVisitUrl(booking.id)}`);
  }
}

export async function notifyAgentVisitorRescheduleInteraction(params: {
  bookingId: string;
  agentUserId: string;
  videoTitle: string;
  visitorName: string;
  kind: "accepted" | "rejected" | "counter";
  whenLabel?: string;
}) {
  const link = visitBookingPath(params.bookingId);
  const when = params.whenLabel ? ` (${params.whenLabel})` : "";
  const msg =
    params.kind === "accepted"
      ? `${params.visitorName} confirmed the proposed visit time for "${params.videoTitle}"${when}.`
      : params.kind === "rejected"
        ? `${params.visitorName} declined the proposed time for "${params.videoTitle}".`
        : `${params.visitorName} suggested a new visit time for "${params.videoTitle}"${when}.`;

  await createNotification({
    userId: params.agentUserId,
    type: NOTIFICATION_TYPES.VISIT_BOOKING_VISITOR_ACTION,
    message: msg,
    linkUrl: link,
  });
}
