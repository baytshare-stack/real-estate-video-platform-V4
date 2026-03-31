"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, MessageCircle, Share2, ThumbsDown, ThumbsUp, UserPlus } from "lucide-react";
import type { ShortVideoPayload } from "./types";
import SubscriptionNotifyDropdown, {
  type NotifyPref,
} from "@/components/channel/SubscriptionNotifyDropdown";
import YouTubePlayer from "@/components/video/YouTubePlayer";
import TemplateMotionPlayer from "@/components/video/TemplateMotionPlayer";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { useShortsPlayback } from "./ShortsPlaybackContext";

type Mode = "feed" | "grid";

function formatCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function isNotifyPref(v: unknown): v is NotifyPref {
  return v === "ALL" || v === "PERSONALIZED" || v === "NONE";
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const days = Math.floor(diff / (86400 * 1000));
  if (days < 1) {
    const h = Math.floor(diff / (3600 * 1000));
    if (h < 1) {
      const m = Math.floor(diff / (60 * 1000));
      return m < 1 ? "just now" : `${m}m ago`;
    }
    return `${h}h ago`;
  }
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ShortVideoPlayer({
  video: initial,
  mode = "feed",
  className,
  onShare,
  onOpenComments,
}: {
  video: ShortVideoPayload;
  mode?: Mode;
  className?: string;
  onShare?: (video: ShortVideoPayload) => void;
  onOpenComments?: (video: ShortVideoPayload) => void;
}) {
  const router = useRouter();
  const { status } = useSession();
  const isFeedMode = mode === "feed";
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const playback = useShortsPlayback();
  const reportFnRef = React.useRef(playback?.reportVisibility);
  reportFnRef.current = playback?.reportVisibility;
  const [localActive, setLocalActive] = React.useState(false);

  const [likes, setLikes] = React.useState(initial.likesCount);
  const [dislikes, setDislikes] = React.useState(initial.dislikesCount);
  const [reaction, setReaction] = React.useState<"LIKE" | "DISLIKE" | null>(initial.userReaction);
  const [subscribed, setSubscribed] = React.useState(initial.subscribed);
  const [subs, setSubs] = React.useState<number | null>(
    initial.subscribersCount != null ? initial.subscribersCount : null
  );
  const [notifyPref, setNotifyPref] = React.useState<NotifyPref>("ALL");
  const [pending, setPending] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLikes(initial.likesCount);
    setDislikes(initial.dislikesCount);
    setReaction(initial.userReaction);
    setSubscribed(initial.subscribed);
    if (initial.subscribersCount != null) setSubs(initial.subscribersCount);
  }, [initial]);

  /* IntersectionObserver → shared coordinator (one active short) or local fallback ≥0.7 */
  React.useEffect(() => {
    if (!isFeedMode) return;
    const el = containerRef.current;
    if (!el) return;
    const id = initial.id;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        const report = reportFnRef.current;
        if (report) {
          report(id, e.intersectionRatio, e.isIntersecting);
        } else {
          setLocalActive(e.isIntersecting && e.intersectionRatio >= 0.7);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.7, 0.75, 1], rootMargin: "0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      reportFnRef.current?.(id, 0, false);
    };
  }, [isFeedMode, initial.id]);

  const isPlaybackActive =
    isFeedMode && (playback ? playback.activeVideoId === initial.id : localActive);

  /* HTML5 Shorts: muted + playsInline for autoplay policy; only active viewport item plays */
  React.useEffect(() => {
    if (!isFeedMode) return;
    if (initial.videoUrl && getYouTubeEmbedUrl(initial.videoUrl)) return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    if (isPlaybackActive) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isFeedMode, isPlaybackActive, initial.videoUrl]);

  React.useEffect(() => {
    if (!initial.channelId) return;
    if (status !== "authenticated") return;
    let cancelled = false;
    void fetch(`/api/channels/${encodeURIComponent(initial.channelId)}/subscribe`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          subscribed?: boolean;
          subscriberCount?: number;
          notificationPreference?: string;
        } | null) => {
          if (cancelled || !data) return;
          if (typeof data.subscribed === "boolean") setSubscribed(data.subscribed);
          if (typeof data.subscriberCount === "number") setSubs(data.subscriberCount);
          if (isNotifyPref(data.notificationPreference)) setNotifyPref(data.notificationPreference);
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initial.channelId, status]);

  const doLike = async () => {
    if (status !== "authenticated") return;
    const prevL = likes;
    const prevD = dislikes;
    const prevR = reaction;
    if (reaction === "LIKE") {
      setLikes((x) => x - 1);
      setReaction(null);
    } else if (reaction === "DISLIKE") {
      setLikes((x) => x + 1);
      setDislikes((x) => x - 1);
      setReaction("LIKE");
    } else {
      setLikes((x) => x + 1);
      setReaction("LIKE");
    }
    setPending("like");
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(initial.id)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "LIKE" }),
      });
      if (!res.ok) throw new Error();
      const j = (await res.json()) as {
        likesCount: number;
        dislikesCount: number;
        userReaction: "LIKE" | "DISLIKE" | null;
      };
      setLikes(j.likesCount);
      setDislikes(j.dislikesCount);
      setReaction(j.userReaction);
    } catch {
      setLikes(prevL);
      setDislikes(prevD);
      setReaction(prevR);
    } finally {
      setPending(null);
    }
  };

  const doDislike = async () => {
    if (status !== "authenticated") return;
    const prevL = likes;
    const prevD = dislikes;
    const prevR = reaction;
    if (reaction === "DISLIKE") {
      setDislikes((x) => x - 1);
      setReaction(null);
    } else if (reaction === "LIKE") {
      setDislikes((x) => x + 1);
      setLikes((x) => x - 1);
      setReaction("DISLIKE");
    } else {
      setDislikes((x) => x + 1);
      setReaction("DISLIKE");
    }
    setPending("dislike");
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(initial.id)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "DISLIKE" }),
      });
      if (!res.ok) throw new Error();
      const j = (await res.json()) as {
        likesCount: number;
        dislikesCount: number;
        userReaction: "LIKE" | "DISLIKE" | null;
      };
      setLikes(j.likesCount);
      setDislikes(j.dislikesCount);
      setReaction(j.userReaction);
    } catch {
      setLikes(prevL);
      setDislikes(prevD);
      setReaction(prevR);
    } finally {
      setPending(null);
    }
  };

  const doSubscribe = async () => {
    if (status !== "authenticated") return;
    if (!initial.channelId) return;
    const prev = subscribed;
    setSubscribed(!prev);
    try {
      const res = await fetch(`/api/channels/${encodeURIComponent(initial.channelId)}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const j = (await res.json()) as {
        subscribed: boolean;
        subscriberCount: number;
        notificationPreference?: string;
      };
      if (typeof j.subscribed === "boolean") setSubscribed(j.subscribed);
      if (typeof j.subscriberCount === "number") setSubs(j.subscriberCount);
      if (isNotifyPref(j.notificationPreference)) setNotifyPref(j.notificationPreference);
      else if (j.subscribed) setNotifyPref("ALL");
    } catch {
      setSubscribed(prev);
    }
  };

  const thumb =
    initial.thumbnail ||
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=720&h=1280";

  const youtubeEmbed = initial.videoUrl ? getYouTubeEmbedUrl(initial.videoUrl) : null;
  const feedVideoPreload = isFeedMode ? (isPlaybackActive ? "metadata" : "none") : "metadata";
  const templateImages = Array.isArray(initial.images)
    ? initial.images.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];
  const isTemplateShort = Boolean(initial.isTemplate && initial.template?.config);
  const locationLine = "Prime location";

  if (!isFeedMode) {
    return (
      <article className={className}>
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
          {isTemplateShort ? (
            <TemplateMotionPlayer
              previewMode
              isPlaying={true}
              config={initial.template?.config}
              images={templateImages}
              audioUrl={initial.audio}
              fallbackAudioUrl={initial.template?.defaultAudio}
              title={initial.title}
              priceLine="Property listing"
              locationLine={locationLine}
              isShort
              channelName={initial.channelName}
              channelAvatarUrl={initial.channelAvatar}
            />
          ) : initial.videoUrl ? (
            youtubeEmbed ? (
              <div className="absolute inset-0 h-full w-full bg-black">
                <YouTubePlayer
                  watchUrl={initial.videoUrl}
                  title={initial.title}
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            ) : (
              <video
                ref={videoRef}
                src={initial.videoUrl}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
                poster={thumb}
              />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={initial.title} className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/85" />
          <div className="absolute right-2 top-2 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void doLike()}
              disabled={status !== "authenticated" || pending === "like"}
              className={`rounded-full bg-black/45 p-2 text-white/90 backdrop-blur disabled:opacity-40 ${reaction === "LIKE" ? "text-sky-400" : ""}`}
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void doDislike()}
              disabled={status !== "authenticated" || pending === "dislike"}
              className={`rounded-full bg-black/45 p-2 text-white/90 backdrop-blur disabled:opacity-40 ${reaction === "DISLIKE" ? "text-rose-400" : ""}`}
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onShare?.(initial)}
              className="rounded-full bg-black/45 p-2 text-white/90 backdrop-blur"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/watch/${initial.id}`)}
            className="absolute inset-0 z-[1]"
            aria-label={initial.title}
          />
          <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
            <button
              type="button"
              onClick={() => router.push(`/channel/${initial.channelId}`)}
              className="flex items-center gap-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initial.channelAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(initial.channelName)}`}
                alt={initial.channelName}
                className="h-8 w-8 rounded-full border border-white/20 object-cover"
              />
              <span className="text-sm font-semibold text-white">{initial.channelName}</span>
            </button>
            <p className="mt-1 line-clamp-2 text-xs text-white/85">{initial.title}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-white/60">
                {formatCompact(initial.viewsCount)} views
                {subs != null ? ` · ${formatCompact(subs)} subs` : ""}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void doSubscribe()}
                  disabled={status !== "authenticated"}
                  className={`rounded-full px-3 py-1 text-xs font-bold disabled:opacity-40 ${
                    subscribed ? "bg-white/15 text-white" : "bg-white text-black"
                  }`}
                >
                  {subscribed ? "Subscribed" : "Subscribe"}
                </button>
                {subscribed && status === "authenticated" ? (
                  <SubscriptionNotifyDropdown
                    channelId={initial.channelId}
                    value={notifyPref}
                    onChange={setNotifyPref}
                    variant="shorts"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <section
      ref={containerRef}
      className={`relative flex h-[calc(100dvh-4rem-3.5rem-env(safe-area-inset-bottom,0px))] min-h-[min(520px,100dvh)] w-full shrink-0 snap-start snap-always justify-center xl:h-[calc(100vh-4rem)] ${className ?? ""}`}
    >
      <div className="relative mx-auto aspect-[9/16] h-full w-full max-h-[calc(100dvh-4rem-3.5rem-env(safe-area-inset-bottom,0px))] max-w-[420px] overflow-hidden rounded-none bg-black sm:rounded-2xl xl:max-h-[calc(100vh-4rem)]">
        {isTemplateShort ? (
          <TemplateMotionPlayer
            previewMode
            isPlaying={isPlaybackActive}
            config={initial.template?.config}
            images={templateImages}
            audioUrl={initial.audio}
            fallbackAudioUrl={initial.template?.defaultAudio}
            title={initial.title}
            priceLine="Property listing"
            locationLine={locationLine}
            isShort
            channelName={initial.channelName}
            channelAvatarUrl={initial.channelAvatar}
          />
        ) : initial.videoUrl ? (
          youtubeEmbed ? (
            <div className="absolute inset-0 h-full w-full bg-black">
              <YouTubePlayer
                watchUrl={initial.videoUrl}
                title={initial.title}
                className="absolute inset-0 h-full w-full"
                variant="shorts-feed"
                shortsPlaybackActive={isPlaybackActive}
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={initial.videoUrl}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              loop
              playsInline
              preload={feedVideoPreload}
              poster={thumb}
            />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={initial.title} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

        <div className="absolute right-2 bottom-28 flex flex-col items-center gap-4 z-10 sm:right-3">
          <button
            type="button"
            onClick={() => void doLike()}
            disabled={status !== "authenticated" || pending === "like"}
            className="flex flex-col items-center gap-0.5 text-white disabled:opacity-40"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/10 ${reaction === "LIKE" ? "text-sky-400" : ""}`}
            >
              <ThumbsUp className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-semibold drop-shadow">{formatCompact(likes)}</span>
          </button>

          <button
            type="button"
            onClick={() => void doDislike()}
            disabled={status !== "authenticated" || pending === "dislike"}
            className="flex flex-col items-center gap-0.5 text-white disabled:opacity-40"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/10 ${reaction === "DISLIKE" ? "text-rose-400" : ""}`}
            >
              <ThumbsDown className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-semibold drop-shadow">{formatCompact(dislikes)}</span>
          </button>

          <button
            type="button"
            onClick={() => onShare?.(initial)}
            className="flex flex-col items-center gap-0.5 text-white"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/10">
              <Share2 className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-semibold drop-shadow">Share</span>
          </button>

          {onOpenComments ? (
            <button
              type="button"
              onClick={() => onOpenComments(initial)}
              className="flex flex-col items-center gap-0.5 text-white"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/10">
                <MessageCircle className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-semibold drop-shadow">{formatCompact(initial.commentsCount)}</span>
            </button>
          ) : null}

          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => void doSubscribe()}
              disabled={status !== "authenticated"}
              className="flex flex-col items-center gap-0.5 text-white disabled:opacity-40"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/10 ${subscribed ? "text-emerald-400" : ""}`}
              >
                {subscribed ? <Check className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
              </span>
              <span className="text-[11px] font-semibold drop-shadow max-w-[52px] text-center leading-tight">
                {subscribed ? "Subscribed" : "Subscribe"}
              </span>
            </button>
            {subscribed && status === "authenticated" ? (
              <SubscriptionNotifyDropdown
                channelId={initial.channelId}
                value={notifyPref}
                onChange={setNotifyPref}
                variant="shorts"
              />
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-14 z-10 p-4 pr-2">
          <button
            type="button"
            onClick={() => router.push(`/channel/${initial.channelId}`)}
            className="mt-2 flex items-center gap-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initial.channelAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(initial.channelName)}`}
              alt={initial.channelName}
              className="h-9 w-9 rounded-full border border-white/20 object-cover"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-white drop-shadow">{initial.channelName}</p>
              <p className="text-xs text-white/70 drop-shadow">
                {formatCompact(initial.viewsCount)} views · {timeAgo(initial.createdAt)}
                {subs != null ? ` · ${formatCompact(subs)} subs` : ""}
              </p>
            </div>
          </button>
          <p className="mt-2 text-sm font-semibold text-white line-clamp-2 drop-shadow-lg">{initial.title}</p>
        </div>
      </div>
    </section>
  );
}
