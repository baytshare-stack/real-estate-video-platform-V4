"use client";

import { getYouTubeEmbedUrl, getYouTubeShortsFeedEmbedSrc, parseYouTubeVideoId } from "@/lib/youtube";

type YouTubePlayerProps = {
  /** Original watch/share URL stored in the database */
  watchUrl: string;
  title: string;
  className?: string;
  /**
   * Shorts vertical feed: alternate embed params and remount when playback toggles
   * so autoplay/mute/loop apply only while the clip is the active viewport item.
   */
  variant?: "default" | "shorts-feed";
  /** When variant is shorts-feed, whether this short is the active one in the feed */
  shortsPlaybackActive?: boolean;
};

const iframeCommon = {
  frameBorder: 0 as const,
  allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
  allowFullScreen: true as const,
};

/**
 * YouTube-only embed. Returns null if watchUrl is not a recognized YouTube link
 * (parent should render <video> or fallback).
 */
export default function YouTubePlayer({
  watchUrl,
  title,
  className = "w-full h-full",
  variant = "default",
  shortsPlaybackActive = false,
}: YouTubePlayerProps) {
  const videoId = parseYouTubeVideoId(watchUrl);
  const embedSrc =
    variant === "shorts-feed"
      ? getYouTubeShortsFeedEmbedSrc(watchUrl, shortsPlaybackActive)
      : getYouTubeEmbedUrl(watchUrl);

  if (!embedSrc) return null;

  /* Remount Shorts iframe when active state changes so autoplay params take effect reliably */
  if (variant === "shorts-feed" && videoId) {
    return (
      <iframe
        key={`${videoId}-${shortsPlaybackActive ? "on" : "off"}`}
        src={embedSrc}
        title={title}
        className={className}
        {...iframeCommon}
      />
    );
  }

  return <iframe src={embedSrc} title={title} className={className} {...iframeCommon} />;
}
