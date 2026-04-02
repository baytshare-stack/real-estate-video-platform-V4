export function formatVisitDateTimeForMessage(date: Date, localeTag = "en-GB"): string {
  try {
    return new Intl.DateTimeFormat(localeTag, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
