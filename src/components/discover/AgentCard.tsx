"use client";

import { BadgeCheck, MapPin, Video } from "lucide-react";
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
import type { DiscoverCardStyle } from "@/lib/site-appearance-shared";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=400";

function cardShell(style: DiscoverCardStyle): { article: string; media: string; overlay: string } {
  switch (style) {
    case "minimal":
      return {
        article:
          "group relative flex flex-col overflow-hidden rounded-lg border border-white/15 bg-transparent transition-colors hover:bg-white/[0.03]",
        media: "relative aspect-[5/4] overflow-hidden bg-black/40",
        overlay: "absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent",
      };
    case "compact":
      return {
        article:
          "group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-md transition hover:border-sky-500/30",
        media: "relative aspect-[5/4] overflow-hidden bg-black/40",
        overlay: "absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent",
      };
    default:
      return {
        article:
          "group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-lg shadow-black/20 transition duration-300 hover:border-sky-500/35 hover:shadow-sky-900/20 hover:-translate-y-0.5",
        media: "relative aspect-[4/3] overflow-hidden bg-black/40",
        overlay: "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent",
      };
  }
}

export default function AgentCard({ agent }: { agent: DiscoverUserRow }) {
  const { ui } = useSiteAppearance();
  const style = ui.discover.agentCardStyle;
  const theme = ui.discover.theme;
  const shell = cardShell(style);
  const name = discoverDisplayName(agent);
  const avatar = discoverAvatarUrl(agent) ?? FALLBACK_AVATAR;
  const location = discoverLocation(agent);
  const listings = discoverListingsCount(agent);
  const titleCls =
    style === "compact" ? "text-base font-semibold" : style === "minimal" ? "text-base font-medium" : "text-lg font-semibold";
  const bodyPad = style === "compact" ? "gap-2 p-3" : style === "minimal" ? "gap-2 p-3" : "gap-3 p-4";
  const btnCls =
    style === "minimal"
      ? "mt-auto inline-flex w-full items-center justify-center rounded-lg bg-sky-600/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
      : "mt-auto inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60";
  const themeCls =
    theme === "glass"
      ? "backdrop-blur-md ring-1 ring-cyan-300/20"
      : theme === "magazine"
        ? "ring-1 ring-rose-300/20"
        : theme === "executive"
          ? "ring-1 ring-emerald-300/20"
          : theme === "neo"
            ? "ring-1 ring-indigo-300/25"
            : "";
  const accent = ui.discover.cardAccent;

  return (
    <article
      className={`${shell.article} ${themeCls}`}
      style={accent ? { boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
    >
      <div className={shell.media}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt=""
          className={`h-full w-full object-cover transition duration-500 ${style === "immersive" ? "group-hover:scale-[1.04]" : "group-hover:scale-[1.02]"}`}
        />
        <div className={shell.overlay} />
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
          <h2 className={`${titleCls} text-white drop-shadow-md line-clamp-1`}>{name}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-white/75">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </p>
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${bodyPad}`}>
        <StarRating value={agent.rating} />
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Video className="h-4 w-4 text-sky-400/90" />
          <span>
            <span className="font-semibold text-white/90">{listings}</span> listings
          </span>
        </div>
        <LocaleLink
          href={`/agent/${agent.id}`}
          className={btnCls}
          style={accent ? { backgroundColor: accent } : undefined}
        >
          View profile
        </LocaleLink>
      </div>
    </article>
  );
}
