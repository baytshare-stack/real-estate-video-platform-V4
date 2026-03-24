import Link from "next/link";
import { BadgeCheck, MapPin, Video } from "lucide-react";
import type { DiscoverUserRow } from "@/lib/discover-queries";
import {
  discoverAvatarUrl,
  discoverDisplayName,
  discoverListingsCount,
  discoverLocation,
} from "@/lib/discover-display";
import StarRating from "./StarRating";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=400";

export default function AgentCard({ agent }: { agent: DiscoverUserRow }) {
  const name = discoverDisplayName(agent);
  const avatar = discoverAvatarUrl(agent) ?? FALLBACK_AVATAR;
  const location = discoverLocation(agent);
  const listings = discoverListingsCount(agent);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-lg shadow-black/20 transition duration-300 hover:border-sky-500/35 hover:shadow-sky-900/20 hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {agent.isFeatured ? (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-black">
            Featured
          </span>
        ) : null}
        {agent.isVerified ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/40">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3">
          <h2 className="text-lg font-semibold text-white drop-shadow-md line-clamp-1">{name}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-white/75">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <StarRating value={agent.rating} />
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Video className="h-4 w-4 text-sky-400/90" />
          <span>
            <span className="font-semibold text-white/90">{listings}</span> listings
          </span>
        </div>
        <Link
          href={`/agent/${agent.id}`}
          className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}
