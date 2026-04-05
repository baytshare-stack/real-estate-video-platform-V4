"use client";

import { Star } from "lucide-react";

export default function StarRating({
  value,
  className = "",
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (value == null || Number.isNaN(value)) {
    return (
      <span className={`text-xs text-white/40 ${className}`}>No ratings yet</span>
    );
  }
  const v = Math.min(5, Math.max(0, value));
  const full = Math.floor(v);
  const half = v - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <div className={`flex items-center gap-0.5 ${className}`} title={`${v.toFixed(1)} / 5`}>
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f-${i}`} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
      ))}
      {half ? (
        <Star className="h-4 w-4 fill-amber-400/50 text-amber-400" aria-hidden />
      ) : null}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e-${i}`} className="h-4 w-4 text-white/20" aria-hidden />
      ))}
      <span className="ml-1.5 text-sm font-medium text-white/80">{v.toFixed(1)}</span>
    </div>
  );
}
