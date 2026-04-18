"use client";

import * as React from "react";

type ServedVideoAd = {
  id: string;
  videoUrl: string;
  type: "PRE_ROLL" | "MID_ROLL";
  skippable: boolean;
  skipAfterSeconds: number;
};

/** Mid-roll cue points as a fraction of main content duration (30%, 60%). */
const MID_ROLL_PROGRESS = [0.3, 0.6] as const;

function isLikelyPlayableVideoUrl(src: string | null | undefined) {
  if (!src?.trim()) return false;
  try {
    const u = new URL(src, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return true;
  } catch {
    return src.startsWith("/uploads/");
  }
}

async function fetchAd(videoId: string, slot: ServedVideoAd["type"]) {
  const res = await fetch(`/api/ads/for-video?videoId=${encodeURIComponent(videoId)}&slot=${slot}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return (data?.ad || null) as ServedVideoAd | null;
}

function track(adId: string, event: "impression" | "click") {
  void fetch(`/api/ads/${event}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ adId }),
  }).catch(() => {});
}

export default function WatchVideoAdsShell({
  watchVideoId,
  outerClassName,
  videoRef,
  children,
}: {
  watchVideoId?: string;
  outerClassName: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  children: React.ReactNode;
}) {
  const [preRollAd, setPreRollAd] = React.useState<ServedVideoAd | null>(null);
  const [midRollAd, setMidRollAd] = React.useState<ServedVideoAd | null>(null);
  const [activeAd, setActiveAd] = React.useState<ServedVideoAd | null>(null);
  const [adProgress, setAdProgress] = React.useState(0);
  const [skipCountdown, setSkipCountdown] = React.useState(0);
  const [skipUnlocked, setSkipUnlocked] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const midFiredRef = React.useRef<Record<number, boolean>>({});
  const adVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const preloadPreRef = React.useRef<HTMLVideoElement | null>(null);
  const preloadMidRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    midFiredRef.current = {};
  }, [watchVideoId]);

  React.useEffect(() => {
    if (!watchVideoId) return;
    void fetchAd(watchVideoId, "PRE_ROLL").then((ad) => {
      setPreRollAd(ad);
      if (ad && isLikelyPlayableVideoUrl(ad.videoUrl)) {
        track(ad.id, "impression");
        setActiveAd(ad);
        setAdProgress(0);
      }
    });
    void fetchAd(watchVideoId, "MID_ROLL").then(setMidRollAd);
  }, [watchVideoId]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el || !activeAd) return;
    try {
      el.pause();
    } catch {
      // ignore
    }
  }, [activeAd, videoRef]);

  React.useEffect(() => {
    if (!activeAd) {
      setSkipUnlocked(false);
      setSkipCountdown(0);
      return;
    }
    if (!activeAd.skippable) {
      setSkipUnlocked(false);
      setSkipCountdown(0);
      return;
    }
    const sec = Math.max(0, activeAd.skipAfterSeconds);
    if (sec === 0) {
      setSkipUnlocked(true);
      setSkipCountdown(0);
      return;
    }
    setSkipUnlocked(false);
    let left = sec;
    setSkipCountdown(left);
    const id = window.setInterval(() => {
      left -= 1;
      setSkipCountdown(Math.max(0, left));
      if (left <= 0) {
        setSkipUnlocked(true);
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeAd?.id, activeAd?.skippable, activeAd?.skipAfterSeconds]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el || !midRollAd || activeAd) return;

    const onTime = () => {
      const current = Number(el.currentTime || 0);
      const duration = Number(el.duration || 0);
      if (!(duration > 0) || Number.isNaN(current)) return;
      const p = current / duration;

      for (const mark of MID_ROLL_PROGRESS) {
        if (p < mark || midFiredRef.current[mark]) continue;
        midFiredRef.current[mark] = true;
        if (!isLikelyPlayableVideoUrl(midRollAd.videoUrl)) return;
        setActiveAd(midRollAd);
        setAdProgress(0);
        try {
          el.pause();
        } catch {
          // ignore
        }
        track(midRollAd.id, "impression");
        return;
      }
    };

    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [videoRef, midRollAd, activeAd]);

  const endAd = React.useCallback(() => {
    setActiveAd(null);
    setAdProgress(0);
    const el = videoRef?.current;
    if (el) void el.play().catch(() => {});
  }, [videoRef]);

  React.useEffect(() => {
    if (!activeAd) return;
    if (!isLikelyPlayableVideoUrl(activeAd.videoUrl)) {
      endAd();
    }
  }, [activeAd, endAd]);

  React.useEffect(() => {
    const url = preRollAd?.videoUrl;
    if (!url || !isLikelyPlayableVideoUrl(url)) return;
    const v = preloadPreRef.current;
    if (v) {
      v.preload = "auto";
      v.src = url;
      try {
        void v.load();
      } catch {
        // ignore
      }
    }
    return () => {
      if (v) v.removeAttribute("src");
    };
  }, [preRollAd?.videoUrl]);

  React.useEffect(() => {
    const url = midRollAd?.videoUrl;
    if (!url || !isLikelyPlayableVideoUrl(url)) return;
    const v = preloadMidRef.current;
    if (v) {
      v.preload = "auto";
      v.src = url;
      try {
        void v.load();
      } catch {
        // ignore
      }
    }
    return () => {
      if (v) v.removeAttribute("src");
    };
  }, [midRollAd?.videoUrl]);

  const canSkip = Boolean(activeAd?.skippable && skipUnlocked);
  const skipLabel = activeAd?.skippable
    ? canSkip
      ? "Skip Ad"
      : `Skip in ${skipCountdown}s`
    : null;

  return (
    <>
      <video ref={preloadPreRef} className="hidden" muted playsInline preload="auto" aria-hidden />
      <video ref={preloadMidRef} className="hidden" muted playsInline preload="auto" aria-hidden />
      <div className={[outerClassName, "relative overflow-hidden"].filter(Boolean).join(" ")}>
        <div
          className={["h-full w-full min-h-0 transition-opacity duration-200", activeAd ? "pointer-events-none opacity-0" : "opacity-100"].join(
            " "
          )}
        >
          {children}
        </div>
        {activeAd ? (
          <div className="absolute inset-0 z-40 flex flex-col bg-black text-white">
            <div className="px-3 pt-3 md:px-6 md:pt-5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-indigo-500 transition-[width] duration-150 ease-out" style={{ width: `${adProgress}%` }} />
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 md:p-6">
              <video
                ref={adVideoRef}
                src={activeAd.videoUrl}
                className="max-h-full max-w-full object-contain"
                autoPlay
                muted={muted}
                playsInline
                preload="auto"
                onEnded={endAd}
                onError={endAd}
                onTimeUpdate={() => {
                  const v = adVideoRef.current;
                  if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
                  setAdProgress(Math.min(100, (v.currentTime / v.duration) * 100));
                }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/90 px-3 py-3 md:px-6">
              <button
                type="button"
                onClick={() => setMuted((v) => !v)}
                className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/90"
              >
                {muted ? "Unmute" : "Mute"}
              </button>
              <div className="flex items-center gap-2">
                {skipLabel ? (
                  <button
                    type="button"
                    disabled={!canSkip}
                    onClick={endAd}
                    className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
                  >
                    {skipLabel}
                  </button>
                ) : (
                  <span className="text-xs text-white/50">Ad</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
