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
    if (s.startsWith("/uploads/videos/") || s.startsWith("/uploads/images/") || s.startsWith("/uploads/ads/")) {
      return s;
    }
    return null;
  }
}

export function normalizeAdTextBody(v: unknown, maxLen = 2000): string | null {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  if (!s) return null;
  return s.slice(0, maxLen);
}
