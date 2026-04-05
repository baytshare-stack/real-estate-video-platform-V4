export function isVideoMediaUrl(url: string): boolean {
  const u = (url.trim().toLowerCase().split("?")[0] ?? "").trim();
  return /\.(mp4|webm|ogg|mov)$/i.test(u);
}
