"use client";

import Link from "next/link";

type ShortCardProps = {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  viewsCount?: number;
};

const FALLBACK_SHORT_THUMBNAIL =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400&h=700";

function compact(n?: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n ?? 0);
}

export default function ShortCard({ id, title, thumbnailUrl, viewsCount = 0 }: ShortCardProps) {
  return (
    <Link
      href={`/watch/${id}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-transform duration-200 hover:scale-[1.02] hover:bg-black/60"
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl || FALLBACK_SHORT_THUMBNAIL}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3">
          <p className="line-clamp-2 text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/70">{compact(viewsCount)} views</p>
        </div>
      </div>
    </Link>
  );
}

