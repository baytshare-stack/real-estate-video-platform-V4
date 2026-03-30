export type TemplateInteractionKind = "view" | "whatsapp" | "call" | "email";

export function trackTemplateInteraction(
  videoId: string,
  channelId: string,
  kind: TemplateInteractionKind
) {
  void fetch("/api/video/template-interaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ videoId, channelId, kind }),
  }).catch(() => {});
}
