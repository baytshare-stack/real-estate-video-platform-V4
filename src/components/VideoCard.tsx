"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bed, Bath, Maximize } from "lucide-react";
import { isYouTubeWatchUrl } from "@/lib/youtube";
import { useSiteAppearance } from "@/components/site/SiteAppearanceProvider";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  price: number;
  currency?: string;
  location: string;
  channelName: string;
  channelAvatarUrl?: string;
  channelId?: string;
  viewsCount: number;
  createdAt: Date;
  isShort?: boolean;

  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  status?: "FOR_SALE" | "FOR_RENT";
}

export default function VideoCard({
  id,
  title,
  thumbnailUrl,
  videoUrl,
  price,
  currency = "USD",
  location,
  channelName,
  channelAvatarUrl,
  channelId,
  viewsCount,
  createdAt,
  isShort = false,
  bedrooms,
  bathrooms,
  sizeSqm,
  status,
}: VideoCardProps) {
  const { ui } = useSiteAppearance();
  const vidLayout = ui.videoCard.layout;
  const vidTheme = ui.videoCard.theme;
  const videoThemeCls =
    vidTheme === "editorial"
      ? "ring-1 ring-rose-300/20"
      : vidTheme === "modern"
        ? "ring-1 ring-sky-300/20"
        : vidTheme === "premium"
          ? "ring-1 ring-amber-300/25"
          : vidTheme === "stream"
            ? "ring-1 ring-emerald-300/20"
            : "ring-1 ring-indigo-300/20";
  const videoTint = ui.videoCard.cardTint;
  const fallbackShortThumbnail =
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400&h=700";
  const fallbackLongThumbnail =
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450";
  const resolvedThumbnail = thumbnailUrl ?? (isShort ? fallbackShortThumbnail : fallbackLongThumbnail);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const formattedPrice = `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(price)} ${currency}`;
  const formattedViews = Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(viewsCount);

  const timeDiff = Math.abs(new Date().getTime() - new Date(createdAt).getTime());
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  const timeAgo = diffDays > 30 ? Math.floor(diffDays / 30) + " months ago" : diffDays + " days ago";

  const startPreview = async () => {
    if (!videoUrl || isYouTubeWatchUrl(videoUrl) || !previewVideoRef.current) return;
    try {
      previewVideoRef.current.currentTime = 0;
      await previewVideoRef.current.play();
      setIsPreviewing(true);
    } catch {
      setIsPreviewing(false);
    }
  };

  const stopPreview = () => {
    if (!previewVideoRef.current) return;
    previewVideoRef.current.pause();
    previewVideoRef.current.currentTime = 0;
    setIsPreviewing(false);
  };

  if (isShort) {
    return (
      <Link href={`/watch/${id}`} className="group block w-[220px] max-w-[min(220px,85vw)] shrink-0">
        <div
          className="relative aspect-[9/16] rounded-xl overflow-hidden mb-2 bg-gray-900 border border-gray-800"
          onMouseEnter={startPreview}
          onMouseLeave={stopPreview}
        >
          <img
            src={resolvedThumbnail}
            alt={title}
            loading="lazy"
            className={`object-cover w-full h-full transition-transform duration-300 ${
              isPreviewing ? "opacity-0" : "opacity-100 group-hover:scale-105"
            }`}
          />
          {videoUrl && !isYouTubeWatchUrl(videoUrl) ? (
            <video
              ref={previewVideoRef}
              src={videoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                isPreviewing ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />
          ) : null}
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-white font-bold text-xs">
            {formattedPrice}
          </div>
          {status ? (
            <div
              className={`absolute top-2 right-2 px-2 py-0.5 rounded text-white font-bold text-xs ${
                status === "FOR_SALE" ? "bg-blue-600" : "bg-purple-600"
              }`}
            >
              {status === "FOR_SALE" ? "For Sale" : "For Rent"}
            </div>
          ) : null}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <h3 className="text-white font-medium text-sm line-clamp-2 leading-tight">{title}</h3>
            <p className="text-gray-300 text-xs mt-1">
              {formattedViews} views • {timeAgo}
            </p>
            <p className="text-gray-200 text-[11px] mt-1 line-clamp-1">
              {location}
              {bedrooms ? ` • ${bedrooms} bd` : ""}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  const thumbBlock = (
    <>
      <img
        src={resolvedThumbnail}
        alt={title}
        loading="lazy"
        className={`h-full w-full object-cover transition-transform duration-300 ${
          isPreviewing ? "opacity-0" : "opacity-100 group-hover:scale-105"
        }`}
      />
      {videoUrl ? (
        <video
          ref={previewVideoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            isPreviewing ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      ) : null}
      {status ? (
        <div
          className={`absolute right-2 top-2 rounded-lg px-2 py-1 text-xs font-bold tracking-wide text-white shadow-lg ${
            status === "FOR_SALE" ? "bg-blue-600/90" : "bg-purple-600/90"
          }`}
        >
          {status === "FOR_SALE" ? "FOR SALE" : "FOR RENT"}
        </div>
      ) : null}
    </>
  );

  if (vidLayout === "poster") {
    return (
      <div
        className={`group flex min-w-0 w-full cursor-pointer flex-col gap-2 transition-transform duration-200 hover:scale-[1.01] ${videoThemeCls}`}
        style={videoTint ? { boxShadow: `inset 0 0 0 1px ${videoTint}` } : undefined}
      >
        <Link href={`/watch/${id}`} className="min-w-0">
          <div
            className="relative aspect-video w-full min-w-0 overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900"
            onMouseEnter={startPreview}
            onMouseLeave={stopPreview}
          >
            {thumbBlock}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent p-3">
              <p className="text-sm font-bold text-white">{formattedPrice}</p>
              <h3 className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-white">{title}</h3>
              <p className="mt-1 line-clamp-1 text-xs text-white/80">{location}</p>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2 px-1">
          <Link href={`/channel/${channelId ?? "demo"}`}>
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
              <img
                src={channelAvatarUrl || `https://ui-avatars.com/api/?name=${channelName}&background=random`}
                alt={channelName}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
          <Link href={`/channel/${channelId ?? "demo"}`} className="min-w-0 truncate text-xs text-gray-400 hover:text-white">
            {channelName} · {formattedViews} views
          </Link>
        </div>
      </div>
    );
  }

  if (vidLayout === "dense") {
    return (
      <div
        className={`group flex min-w-0 w-full cursor-pointer flex-col gap-2 transition-transform duration-200 hover:scale-[1.01] ${videoThemeCls}`}
        style={videoTint ? { boxShadow: `inset 0 0 0 1px ${videoTint}` } : undefined}
      >
        <Link href={`/watch/${id}`} className="min-w-0">
          <div
            className="relative aspect-video w-full min-w-0 overflow-hidden rounded-lg border border-gray-800/50 bg-gray-900"
            onMouseEnter={startPreview}
            onMouseLeave={stopPreview}
          >
            {thumbBlock}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <p className="text-xs font-semibold text-white">{formattedPrice}</p>
              <p className="line-clamp-1 text-[11px] text-gray-200">{location}</p>
            </div>
          </div>
        </Link>
        <div className="flex gap-2 px-0.5">
          <Link href={`/channel/${channelId ?? "demo"}`}>
            <div className="mt-0.5 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
              <img
                src={channelAvatarUrl || `https://ui-avatars.com/api/?name=${channelName}&background=random`}
                alt={channelName}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
          <div className="min-w-0 flex-1 overflow-hidden">
            <Link href={`/watch/${id}`}>
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white transition-colors group-hover:text-blue-400">
                {title}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs font-semibold text-gray-300">
              {formattedPrice} <span className="font-normal text-gray-500">· {location}</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-500">
              {bedrooms ? (
                <span className="flex items-center gap-0.5">
                  <Bed className="h-3 w-3" /> {bedrooms}
                </span>
              ) : null}
              {bathrooms ? (
                <span className="flex items-center gap-0.5">
                  <Bath className="h-3 w-3" /> {bathrooms}
                </span>
              ) : null}
              {sizeSqm ? (
                <span className="flex items-center gap-0.5">
                  <Maximize className="h-3 w-3" /> {sizeSqm}
                </span>
              ) : null}
            </div>
            <Link href={`/channel/${channelId ?? "demo"}`}>
              <p className="mt-1 truncate text-[11px] text-gray-500 hover:text-gray-300">{channelName}</p>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex min-w-0 w-full cursor-pointer flex-col gap-3 transition-transform duration-200 hover:scale-[1.01] ${videoThemeCls}`}
      style={videoTint ? { boxShadow: `inset 0 0 0 1px ${videoTint}` } : undefined}
    >
      <Link href={`/watch/${id}`} className="min-w-0">
        <div
          className="relative aspect-video w-full min-w-0 overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900"
          onMouseEnter={startPreview}
          onMouseLeave={stopPreview}
        >
          {thumbBlock}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <p className="text-sm font-semibold text-white">{formattedPrice}</p>
            <p className="line-clamp-1 text-xs text-gray-200">{location}</p>
            {bedrooms ? <p className="text-xs text-gray-300">{bedrooms} bedrooms</p> : null}
          </div>
        </div>
      </Link>

      <div className="flex gap-3 px-1">
        <Link href={`/channel/${channelId ?? "demo"}`}>
          <div className="mt-1 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
            <img
              src={channelAvatarUrl || `https://ui-avatars.com/api/?name=${channelName}&background=random`}
              alt={channelName}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </Link>

        <div className="flex w-full flex-col overflow-hidden">
          <Link href={`/watch/${id}`}>
            <h3 className="line-clamp-2 text-base font-medium leading-snug text-white transition-colors group-hover:text-blue-400">
              {title}
            </h3>
          </Link>

          <div className="mt-1 text-sm font-semibold text-gray-300">
            {formattedPrice} <span className="ml-1 font-normal text-gray-500">• {location}</span>
          </div>

          <div className="mt-1.5 flex items-center gap-3 text-xs font-medium text-gray-400">
            {bedrooms ? (
              <div className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" /> {bedrooms} Beds
              </div>
            ) : null}
            {bathrooms ? (
              <div className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" /> {bathrooms} Baths
              </div>
            ) : null}
            {sizeSqm ? (
              <div className="flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5" /> {sizeSqm} sqm
              </div>
            ) : null}
          </div>

          <Link href={`/channel/${channelId ?? "demo"}`}>
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white">
              {channelName}
              <svg className="h-3 w-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="ml-1 h-1 w-1 rounded-full bg-gray-600" />
              <span className="ml-1">{formattedViews} views</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
