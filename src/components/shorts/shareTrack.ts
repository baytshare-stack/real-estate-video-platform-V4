export type SharePlatform =
  | "whatsapp"
  | "facebook"
  | "telegram"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "copy";

export async function trackVideoShare(videoId: string, platform: SharePlatform) {
  await fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ videoId, platform }),
  }).catch(() => {});
}
