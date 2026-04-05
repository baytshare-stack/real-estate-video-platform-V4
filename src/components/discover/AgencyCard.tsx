"use client";

import { BadgeCheck, Building2, MapPin, Video } from "lucide-react";
import type { DiscoverUserRow } from "@/lib/discover-queries";
import {
  discoverAvatarUrl,
  discoverDisplayName,
  discoverListingsCount,
  discoverLocation,
} from "@/lib/discover-display";
import StarRating from "./StarRating";
import LocaleLink from "@/components/LocaleLink";
import { useSiteAppearance } from "@/components/site/SiteAppearanceProvider";
import type { DiscoverCardStyle } from "@/lib/site-appearance";

const FALLBACK_LOGO =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400&h=400";

function cardShell(style: DiscoverCardStyle): { article: string; media: string } {
  switch (style) {
    case "minimal":
      return {
        article:
          "group relative flex flex-col overflow-hidden rounded-lg border border-white/15 bg-transparent transition-colors hover:bg-white/[0.03]",
        media: "relative aspect-[5/3] overflow-hidden bg-black/50",
      };
    case "compact":
      return {
        article:
          "group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-violet-500/[0.06] shadow-md transition hover:border-violet-400/35",
        media: "relative aspect-[5/3] overflow-hidden bg-black/50",
      };
    default:
      return {
        article:
          "group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-violet-500/[0.08] to-white/[0.02] shadow-lg shadow-black/20 transition duration-300 hover:border-violet-400/40 hover:shadow-violet-950/25 hover:-translate-y-0.5",
        media: "relative aspect-[5/3] overflow-hidden bg-black/50",
      };
  }
}

export default function AgencyCard({ agency }: { agency: DiscoverUserRow }) {
  const { ui } = useSiteAppearance();
  const style = ui.discover.agencyCardStyle;
  const shell = cardShell(style);
  const name = discoverDisplayName(agency);
  const logo = discoverAvatarUrl(agency) ?? FALLBACK_LOGO;
  const location = discoverLocation(agency);
  const listings = discoverListingsCount(agency);
  const showLogoBadge = style === "immersive";
  const bodyPad = style === "compact" || style === "minimal" ? "gap-2 p-3" : "gap-3 p-4";
  const verifiedPos = style === "immersive" ? "right-3 top-16" : "right-3 top-3";
  const btnCls =
    style === "minimal"
      ? "mt-auto inline-flex w-full items-center justify-center rounded-lg bg-violet-600/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
      : "mt-auto inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60";

  return (
    <article className={shell.article}>
      <div className={shell.media}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          className={`h-full w-full object-cover transition duration-500 ${style === "immersive" ? "group-hover:scale-[1.03]" : "group-hover:scale-[1.02]"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        {showLogoBadge ? (
          <div className="absolute left-3 top-3 flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-black/40 shadow-lg backdrop-blur-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" className="h-11 w-11 rounded-lg object-cover" />
          </div>
        ) : null}
        {agency.isFeatured ? (
          <span
            className={`absolute ${showLogoBadge ? "right-3 top-3" : "left-3 top-3"} rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-black`}
          >
            Featured
          </span>
        ) : null}
        {agency.isVerified ? (
          <span
            className={`absolute ${verifiedPos} inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/40`}
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-violet-300" />
            <h2 className="text-lg font-semibold text-white drop-shadow-md line-clamp-1">{name}</h2>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/75">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </p>
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${bodyPad}`}>
        <StarRating value={agency.rating} />
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Video className="h-4 w-4 text-violet-400/90" />
          <span>
            <span className="font-semibold text-white/90">{listings}</span> property videos
          </span>
        </div>
        <LocaleLink href={`/agency/${agency.id}`} className={btnCls}>
          View company
        </LocaleLink>
      </div>
    </article>
  );
}
