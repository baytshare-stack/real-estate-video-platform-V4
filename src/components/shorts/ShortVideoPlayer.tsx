"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ShortVideoPayload } from "./types";

type Mode = "feed" | "grid";

function formatCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
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

function useInViewActive(ref: React.RefObject<HTMLElement | null>, rootMargin = "0px") {
  const [active, setActive] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting && e.intersectionRatio > 0.45),
      { threshold: [0, 0.45, 0.6, 1], rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return active;
}

export default function ShortVideoPlayer({
  video: initial,
  mode = "feed",
  className,
  onShare,
}: {
  video: ShortVideoPayload;
  mode?: Mode;
  className?: string;
  onShare?: (video: ShortVideoPayload) => void;
}) {
  const router = useRouter();
  const { status } = useSession();
  const isFeedMode = mode === "feed";
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const active = useInViewActive(containerRef);

  const [likes, setLikes] = React.useState(initial.likesCount);
  const [dislikes, setDislikes] = React.useState(initial.dislikesCount);
  const [reaction, setReaction] = React.useState<"LIKE" | "DISLIKE" | null>(initial.userReaction);
  const [subscribed, setSubscribed] = React.useState(initial.subscribed);
  const [subs, setSubs] = React.useState<number | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLikes(initial.likesCount);
    setDislikes(initial.dislikesCount);
    setReaction(initial.userReaction);
    setSubscribed(initial.subscribed);
  }, [initial]);

  React.useEffect(() => {
    if (!isFeedMode) return;
    const el = videoRef.current;
    if (!el) return;
    if (active) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active, isFeedMode]);

  React.useEffect(() => {
    if (!initial.channelId) return;
    if (status !== "authenticated") return;
    let cancelled = false;
    void fetch(`/api/channels/${encodeURIComponent(initial.channelId)}/subscribe`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { subscribed?: boolean; subscriberCount?: number } | null) => {
        if (cancelled || !data) return;
        if (typeof data.subscribed === "boolean") setSubscribed(data.subscribed);
        if (typeof data.subscriberCount === "number") setSubs(data.subscriberCount);
      })
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
      const j = (await res.json()) as { subscribed: boolean; subscriberCount: number };
      if (typeof j.subscribed === "boolean") setSubscribed(j.subscribed);
      if (typeof j.subscriberCount === "number") setSubs(j.subscriberCount);
    } catch {
      setSubscribed(prev);
    }
  };

  const thumb =
    initial.thumbnail ||
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=720&h=1280";

  if (!isFeedMode) {
    return (
      <article className={className}>
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
          {initial.videoUrl ? (
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
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-white/60">{formatCompact(initial.viewsCount)} views</span>
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
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <section
      ref={containerRef}
      className={`relative h-[calc(100vh-64px)] min-h-[520px] w-full snap-start snap-always shrink-0 flex justify-center ${className ?? ""}`}
    >
      <div className="relative h-full w-full max-w-[420px] overflow-hidden rounded-none sm:rounded-2xl bg-black aspect-[9/16] max-h-[calc(100vh-64px)] mx-auto">
        {initial.videoUrl ? (
          <video
            ref={videoRef}
            src={initial.videoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            loop
            playsInline
            poster={thumb}
          />
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

          <button
            type="button"
            onClick={() => void doSubscribe()}
            disabled={status !== "authenticated"}
            className="flex flex-col items-center gap-0.5 text-white disabled:opacity-40"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/10 ${subscribed ? "text-amber-400" : ""}`}
            >
              <Bell className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-semibold drop-shadow max-w-[52px] text-center leading-tight">
              {subscribed ? "Subscribed" : "Subscribe"}
            </span>
          </button>
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

