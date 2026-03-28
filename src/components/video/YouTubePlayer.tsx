"use client";

import { getYouTubeEmbedUrl } from "@/lib/youtube";

type YouTubePlayerProps = {
  /** Original watch/share URL stored in the database */
  watchUrl: string;
  title: string;
  className?: string;
};

/**
 * YouTube-only embed. Returns null if watchUrl is not a recognized YouTube link
 * (parent should render <video> or fallback).
 */
export default function YouTubePlayer({ watchUrl, title, className = "w-full h-full" }: YouTubePlayerProps) {
  const embedSrc = getYouTubeEmbedUrl(watchUrl);
  if (!embedSrc) return null;

  return (
    <iframe
      src={embedSrc}
      title={title}
      className={className}
      frameBorder={0}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
