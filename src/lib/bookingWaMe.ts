import { whatsappUrl } from "@/lib/crmContactLinks";

/** E.164-style digits only (no +), suitable for wa.me/{digits} */
export function bookingPhoneDigits(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

/** Pre-filled booking message: property title, date, time (uses encodeURIComponent via whatsappUrl). */
export function buildBookingWhatsAppHref(
  digits: string,
  videoTitle: string,
  scheduledAt: Date,
  localeTag = "en-GB",
  visitUrl?: string
): string {
  const dateStr = new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(scheduledAt);
  const timeStr = new Intl.DateTimeFormat(localeTag, {
    hour: "numeric",
    minute: "2-digit",
  }).format(scheduledAt);
  const text = `Property: ${videoTitle}\nDate: ${dateStr}\nTime: ${timeStr}${visitUrl ? `\nManage visit: ${visitUrl}` : ""}`;
  return whatsappUrl(digits, text);
}
