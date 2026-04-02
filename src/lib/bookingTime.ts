/** Local date (YYYY-MM-DD) + time (HH:mm) → ISO string, same semantics as browser `Date` parsing. */
export function localDateTimeToIso(dateYmd: string, timeHm: string): string | null {
  const dPart = dateYmd.trim();
  const tRaw = timeHm.trim();
  if (!dPart || !tRaw) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(tRaw);
  if (!m) return null;
  const hh = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  const isoLocal = `${dPart}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatTimeHmFrom24(h24: number, minute: number): string {
  const h = Math.min(23, Math.max(0, h24));
  const m = Math.min(59, Math.max(0, minute));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTimeHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}
