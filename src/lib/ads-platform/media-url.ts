/** Accepts absolute http(s) URLs and same-origin paths from local upload (e.g. /uploads/videos/…). */
export function normalizeAdMediaUrl(v: unknown): string | null {
  const s = String(v || "").trim();
  if (!s) return null;
  if (s.includes("..")) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    if (s.startsWith("/uploads/videos/") || s.startsWith("/uploads/images/")) {
      return s;
    }
    return null;
  }
}
