/** Compact subscriber count (YouTube-style: 1.2K, 12K, 1.2M). */
export function formatSubscriberCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  const x = Math.floor(n);
  if (x < 1000) return String(x);
  if (x < 1_000_000) {
    const k = x / 1000;
    if (k < 10) return `${Math.round(k * 10) / 10}`.replace(/\.0$/, "") + "K";
    if (k < 100) return `${Math.round(k * 10) / 10}`.replace(/\.0$/, "") + "K";
    return `${Math.round(k)}K`;
  }
  const m = x / 1_000_000;
  return `${Math.round(m * 10) / 10}`.replace(/\.0$/, "") + "M";
}
