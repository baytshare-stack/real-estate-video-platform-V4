const STYLES: Record<string, string> = {
  ACTIVE: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
  PAUSED: "border-amber-500/35 bg-amber-500/15 text-amber-100",
  DRAFT: "border-white/15 bg-white/10 text-white/75",
  ENDED: "border-zinc-500/30 bg-zinc-700/40 text-zinc-300",
  DELETED: "border-rose-500/40 bg-rose-500/15 text-rose-200",
};

export function AdsLifecycleBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? STYLES.DRAFT!;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}
