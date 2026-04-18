const STORAGE_KEY = "revp_ad_vk_v1";

/** Stable pseudo-anonymous key for ad frequency / rotation (not PII). */
export function getOrCreateAdViewerKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let v = window.localStorage.getItem(STORAGE_KEY);
    if (v && v.length >= 8) return v;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    v = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(STORAGE_KEY, v);
    return v;
  } catch {
    return "";
  }
}
