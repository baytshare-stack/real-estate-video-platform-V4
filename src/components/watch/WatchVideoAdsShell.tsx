"use client";

import * as React from "react";
import { isVideoMediaUrl } from "@/lib/smart-ads/is-video-media-url";

export type WatchVideoAd = {
  id: string;
  title: string;
  description: string | null;
  position: "BEFORE" | "MID" | "AFTER" | "OVERLAY" | string;
  mediaUrl?: string | null;
  clickUrl?: string | null;
  preRollGate?: boolean;
  track?: "smart" | null;
};

function useSmartImpressionOnce(ad: WatchVideoAd, watchVideoId: string | undefined) {
  const sent = React.useRef(false);
  React.useEffect(() => {
    if (ad.track !== "smart" || !watchVideoId || sent.current) return;
    sent.current = true;
    void fetch("/api/ads/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ adId: ad.id, videoId: watchVideoId }),
    }).catch(() => {});
  }, [ad.id, ad.track, watchVideoId]);
}

function trackSmartClick(ad: WatchVideoAd, watchVideoId: string | undefined) {
  if (ad.track !== "smart" || !watchVideoId) return;
  void fetch("/api/ads/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ adId: ad.id, videoId: watchVideoId }),
  }).catch(() => {});
}

function AdCreative({ ad, watchVideoId }: { ad: WatchVideoAd; watchVideoId?: string }) {
  useSmartImpressionOnce(ad, watchVideoId);

  const isVideo = ad.mediaUrl ? isVideoMediaUrl(ad.mediaUrl) : false;

  const onOpen = () => {
    trackSmartClick(ad, watchVideoId);
    if (ad.clickUrl?.trim()) {
      window.open(ad.clickUrl.trim(), "_blank", "noopener,noreferrer");
    }
  };

  const media =
    ad.mediaUrl && ad.mediaUrl.trim() ? (
      isVideo ? (
        <video
          src={ad.mediaUrl.trim()}
          className="w-full max-h-52 rounded-lg border border-white/10 bg-black object-cover"
          muted
          playsInline
          loop
          autoPlay
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.mediaUrl.trim()}
          alt=""
          className="w-full max-h-52 rounded-lg border border-white/10 object-cover"
        />
      )
    ) : null;

  const body = (
    <div className="space-y-2">
      {media}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-indigo-200">{ad.title}</p>
        {ad.description ? (
          <p className="mt-1 text-xs leading-snug text-white/70 line-clamp-4">{ad.description}</p>
        ) : null}
      </div>
      {ad.clickUrl?.trim() ? (
        <p className="text-[10px] text-indigo-200/80">Click the creative to open the sponsor link.</p>
      ) : null}
    </div>
  );

  if (ad.clickUrl?.trim()) {
    return (
      <div
        role="button"
        tabIndex={0}
        className="w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
      >
        {body}
      </div>
    );
  }

  return <div className="w-full">{body}</div>;
}

function AdCard({
  ad,
  watchVideoId,
  onDismiss,
}: {
  ad: WatchVideoAd;
  watchVideoId?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-xl border border-indigo-500/35 bg-gradient-to-r from-indigo-950/95 via-zinc-900/95 to-zinc-950/95 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
      <div className="flex justify-between gap-3">
        <div className="min-w-0 flex-1">
          <AdCreative ad={ad} watchVideoId={watchVideoId} />
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="h-8 w-8 shrink-0 self-start rounded-lg border border-white/10 bg-white/5 text-lg leading-none text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function WatchVideoAdsShell({
  ads,
  watchVideoId,
  outerClassName,
  videoRef,
  children,
}: {
  ads: WatchVideoAd[];
  watchVideoId?: string;
  outerClassName: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  children: React.ReactNode;
}) {
  const list = Array.isArray(ads) ? ads : [];

  const preRollGated = list.filter((a) => a.preRollGate === true);
  const beforeInline = list.filter((a) => a.position === "BEFORE" && !a.preRollGate);
  const mid = list.filter((a) => a.position === "MID");
  const after = list.filter((a) => a.position === "AFTER");
  const overlay = list.filter((a) => a.position === "OVERLAY");

  const [dismissed, setDismissed] = React.useState<Record<string, boolean>>({});
  const dismiss = (id: string) => setDismissed((d) => ({ ...d, [id]: true }));

  const [midOpen, setMidOpen] = React.useState(false);
  const midShownRef = React.useRef(false);

  const activePreRoll = preRollGated.filter((a) => !dismissed[a.id]);
  const preRollBlocking = activePreRoll.length > 0;
  const primaryPreRoll = activePreRoll[0];

  React.useEffect(() => {
    midShownRef.current = false;
    setMidOpen(false);
  }, [list]);

  React.useEffect(() => {
    if (!mid.length || midShownRef.current) return;

    if (!videoRef) {
      const t = window.setTimeout(() => {
        if (!midShownRef.current) {
          midShownRef.current = true;
          setMidOpen(true);
        }
      }, 12000);
      return () => window.clearTimeout(t);
    }

    let detach: (() => void) | null = null;
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      const el = videoRef.current;
      if (el && !midShownRef.current) {
        const onTime = () => {
          if (midShownRef.current) return;
          const dur = el.duration;
          if (dur > 0 && !Number.isNaN(dur) && el.currentTime >= dur * 0.5) {
            midShownRef.current = true;
            setMidOpen(true);
          }
        };
        el.addEventListener("timeupdate", onTime);
        detach = () => el.removeEventListener("timeupdate", onTime);
        window.clearInterval(poll);
        return;
      }
      if (attempts >= 60 && !midShownRef.current) {
        window.clearInterval(poll);
        midShownRef.current = true;
        setMidOpen(true);
      }
    }, 100);

    return () => {
      window.clearInterval(poll);
      detach?.();
    };
  }, [mid.length, videoRef]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el) return;
    if (preRollBlocking) {
      try {
        el.pause();
      } catch {
        /* ignore */
      }
    }
  }, [preRollBlocking, videoRef]);

  const visibleOverlay = overlay.filter((a) => !dismissed[a.id]);
  const visibleMid = midOpen ? mid.filter((a) => !dismissed[a.id]) : [];

  return (
    <>
      {beforeInline.length ? (
        <div className="mb-2 space-y-2">
          {beforeInline.map((a) =>
            dismissed[a.id] ? null : (
              <AdCard key={a.id} ad={a} watchVideoId={watchVideoId} onDismiss={() => dismiss(a.id)} />
            )
          )}
        </div>
      ) : null}

      <div className={[outerClassName, "relative"].filter(Boolean).join(" ")}>
        <div
          className={[
            "h-full w-full min-h-0",
            preRollBlocking ? "pointer-events-none select-none opacity-0" : "",
          ].join(" ")}
        >
          {children}
        </div>

        {preRollBlocking && primaryPreRoll ? (
          <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/80 p-3 backdrop-blur-sm md:p-5">
            <div className="mx-auto w-full max-w-lg">
              <AdCard
                ad={primaryPreRoll}
                watchVideoId={watchVideoId}
                onDismiss={() => dismiss(primaryPreRoll.id)}
              />
              <p className="mt-2 text-center text-[10px] text-white/40">Sponsored</p>
            </div>
          </div>
        ) : null}

        {visibleOverlay.length ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end gap-2 p-3 md:p-4">
            {visibleOverlay.map((a) => (
              <div key={a.id} className="pointer-events-auto max-w-full md:max-w-lg">
                <AdCard ad={a} watchVideoId={watchVideoId} onDismiss={() => dismiss(a.id)} />
              </div>
            ))}
          </div>
        ) : null}

        {visibleMid.length ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md space-y-3">
              {visibleMid.map((a) => (
                <AdCard key={a.id} ad={a} watchVideoId={watchVideoId} onDismiss={() => dismiss(a.id)} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {after.length ? (
        <div className="mt-2 space-y-2">
          {after.map((a) =>
            dismissed[a.id] ? null : (
              <AdCard key={a.id} ad={a} watchVideoId={watchVideoId} onDismiss={() => dismiss(a.id)} />
            )
          )}
        </div>
      ) : null}
    </>
  );
}
