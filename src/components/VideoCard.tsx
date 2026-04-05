"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bed, Bath, Maximize } from "lucide-react";
import { isYouTubeWatchUrl } from "@/lib/youtube";

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

  return (
    <div className="group flex min-w-0 w-full cursor-pointer flex-col gap-3 transition-transform duration-200 hover:scale-[1.01]">
      <Link href={`/watch/${id}`} className="min-w-0">
        <div
          className="relative aspect-video w-full min-w-0 overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900"
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
          {videoUrl ? (
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
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/55 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-white text-sm font-semibold">{formattedPrice}</p>
            <p className="text-gray-200 text-xs line-clamp-1">{location}</p>
            {bedrooms ? <p className="text-gray-300 text-xs">{bedrooms} bedrooms</p> : null}
          </div>
          {status ? (
            <div
              className={`absolute top-2 right-2 px-3 py-1 rounded-lg text-white font-bold text-xs tracking-wide shadow-lg ${
                status === "FOR_SALE" ? "bg-blue-600/90" : "bg-purple-600/90"
              }`}
            >
              {status === "FOR_SALE" ? "FOR SALE" : "FOR RENT"}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex gap-3 px-1">
        <Link href={`/channel/${channelId ?? "demo"}`}>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-gray-700 flex-shrink-0 mt-1">
            <img
              src={channelAvatarUrl || `https://ui-avatars.com/api/?name=${channelName}&background=random`}
              alt={channelName}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        </Link>

        <div className="flex flex-col overflow-hidden w-full">
          <Link href={`/watch/${id}`}>
            <h3 className="text-white font-medium text-base line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
          </Link>

          <div className="text-gray-300 font-semibold text-sm mt-1">
            {formattedPrice} <span className="text-gray-500 font-normal ml-1">• {location}</span>
          </div>

          <div className="flex items-center gap-3 text-gray-400 text-xs mt-1.5 font-medium">
            {bedrooms ? (
              <div className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" /> {bedrooms} Beds
              </div>
            ) : null}
            {bathrooms ? (
              <div className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5" /> {bathrooms} Baths
              </div>
            ) : null}
            {sizeSqm ? (
              <div className="flex items-center gap-1">
                <Maximize className="w-3.5 h-3.5" /> {sizeSqm} sqm
              </div>
            ) : null}
          </div>

          <Link href={`/channel/${channelId ?? "demo"}`}>
            <div className="text-gray-400 text-xs mt-2 hover:text-white transition-colors flex items-center gap-1">
              {channelName}
              <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="w-1 h-1 rounded-full bg-gray-600 ml-1" />
              <span className="ml-1">{formattedViews} views</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
