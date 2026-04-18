"use client";

import * as React from "react";
import { getOrCreateAdViewerKey } from "@/lib/ads-client/viewer-key";
import type { ServedVideoAdPayload } from "@/lib/video-ads/served-ad-payload";

type ServedVideoAd = ServedVideoAdPayload;

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

function adCanDisplay(ad: ServedVideoAd | null): boolean {
  if (!ad) return false;
  if (ad.mediaType === "IMAGE") return Boolean(ad.imageUrl?.trim());
  return isLikelyPlayableVideoUrl(ad.videoUrl);
}

async function fetchAd(videoId: string, slot: ServedVideoAd["type"], viewerKey: string) {
  const q = new URLSearchParams({
    videoId,
    slot,
  });
  if (viewerKey) q.set("viewerKey", viewerKey);
  const res = await fetch(`/api/ads/for-video?${q.toString()}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return (data?.ad || null) as ServedVideoAd | null;
}

function trackImpression(adId: string, viewerKey: string) {
  void fetch(`/api/ads/impression`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ adId, viewerKey: viewerKey || undefined }),
  }).catch(() => {});
}

function trackClick(adId: string) {
  void fetch(`/api/ads/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ adId }),
  }).catch(() => {});
}

function trackView(adId: string, watchSeconds?: number) {
  void fetch(`/api/ads/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ adId, watchSeconds }),
  }).catch(() => {});
}

function midRollCueSeconds(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  if (duration >= 120) return [30, 60];
  if (duration >= 60) return [30];
  return [];
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
  const [mainDuration, setMainDuration] = React.useState(0);
  const [leadOpen, setLeadOpen] = React.useState(false);
  const [leadName, setLeadName] = React.useState("");
  const [leadPhone, setLeadPhone] = React.useState("");
  const [leadBusy, setLeadBusy] = React.useState(false);
  const [leadMsg, setLeadMsg] = React.useState<string | null>(null);

  const midFiredRef = React.useRef<Record<number, boolean>>({});
  const adVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const preloadPreRef = React.useRef<HTMLVideoElement | null>(null);
  const preloadMidRef = React.useRef<HTMLVideoElement | null>(null);
  const viewSentRef = React.useRef(false);
  const adStartTimeRef = React.useRef(0);
  const viewerKeyRef = React.useRef("");

  React.useLayoutEffect(() => {
    viewerKeyRef.current = getOrCreateAdViewerKey();
  }, []);

  React.useEffect(() => {
    midFiredRef.current = {};
  }, [watchVideoId]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el) return;
    const onMeta = () => setMainDuration(Number(el.duration) || 0);
    el.addEventListener("loadedmetadata", onMeta);
    onMeta();
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [videoRef, watchVideoId, children]);

  React.useEffect(() => {
    if (!watchVideoId) return;
    const vk = viewerKeyRef.current || getOrCreateAdViewerKey();
    void Promise.all([fetchAd(watchVideoId, "PRE_ROLL", vk), fetchAd(watchVideoId, "MID_ROLL", vk)]).then(([pre, mid]) => {
      setPreRollAd(pre);
      setMidRollAd(mid);
      if (pre && adCanDisplay(pre)) {
        trackImpression(pre.id, vk);
        viewSentRef.current = false;
        adStartTimeRef.current = typeof performance !== "undefined" ? performance.now() : 0;
        setActiveAd(pre);
        setAdProgress(0);
      }
    });
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

  const endAd = React.useCallback(() => {
    const cur = activeAd;
    const v = adVideoRef.current;
    const watchedSec =
      cur?.mediaType === "VIDEO" && v && Number.isFinite(v.currentTime) ? v.currentTime : undefined;
    if (cur && !viewSentRef.current) {
      viewSentRef.current = true;
      const wallSec =
        typeof performance !== "undefined" && adStartTimeRef.current
          ? (performance.now() - adStartTimeRef.current) / 1000
          : undefined;
      trackView(cur.id, watchedSec ?? wallSec);
    }
    setActiveAd(null);
    setAdProgress(0);
    setLeadOpen(false);
    const el = videoRef?.current;
    if (el) void el.play().catch(() => {});
  }, [activeAd, videoRef]);

  React.useEffect(() => {
    if (!activeAd) return;
    if (!adCanDisplay(activeAd)) {
      endAd();
    }
  }, [activeAd, endAd]);

  React.useEffect(() => {
    if (!activeAd || activeAd.mediaType !== "IMAGE") return;
    const sec = Math.max(3, Math.min(120, Number(activeAd.durationSeconds) || 8));
    const started = performance.now();
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      setAdProgress(Math.min(100, (elapsed / sec) * 100));
      if (elapsed >= sec) {
        window.clearInterval(id);
        endAd();
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [activeAd, endAd]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el || !midRollAd || activeAd) return;

    const cues = midRollCueSeconds(mainDuration);
    if (!cues.length) return;

    const onTime = () => {
      const current = Number(el.currentTime || 0);
      for (const atSec of cues) {
        if (current < atSec || midFiredRef.current[atSec]) continue;
        midFiredRef.current[atSec] = true;
        if (!adCanDisplay(midRollAd)) return;
        trackImpression(midRollAd.id, viewerKeyRef.current || getOrCreateAdViewerKey());
        viewSentRef.current = false;
        adStartTimeRef.current = typeof performance !== "undefined" ? performance.now() : 0;
        setActiveAd(midRollAd);
        setAdProgress(0);
        try {
          el.pause();
        } catch {
          // ignore
        }
        return;
      }
    };

    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [videoRef, midRollAd, activeAd, mainDuration]);

  React.useEffect(() => {
    const url = preRollAd?.mediaType === "VIDEO" ? preRollAd.videoUrl : null;
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
  }, [preRollAd]);

  React.useEffect(() => {
    const url = midRollAd?.mediaType === "VIDEO" ? midRollAd.videoUrl : null;
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
  }, [midRollAd]);

  const canSkip = Boolean(activeAd?.skippable && skipUnlocked);
  const skipLabel = activeAd?.skippable
    ? canSkip
      ? "Skip Ad"
      : `Skip in ${skipCountdown}s`
    : null;

  const onCta = () => {
    if (!activeAd) return;
    trackClick(activeAd.id);
    const url = (activeAd.ctaUrl || "").trim();
    if (activeAd.ctaType === "BOOK_VISIT" && url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (activeAd.ctaType === "WHATSAPP" && url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (activeAd.ctaType === "CALL" && url) {
      window.location.href = url.startsWith("tel:") ? url : `tel:${url}`;
      return;
    }
    setLeadOpen(true);
    setLeadMsg(null);
  };

  const submitLead = async () => {
    if (!activeAd) return;
    setLeadBusy(true);
    setLeadMsg(null);
    try {
      const res = await fetch("/api/ads/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          adId: activeAd.id,
          ...(watchVideoId ? { videoId: watchVideoId } : {}),
          name: leadName.trim(),
          phone: leadPhone.trim(),
          source: "AD",
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; whatsappLink?: string };
      if (!res.ok) throw new Error(j.error || "Failed");
      if (j.whatsappLink) window.open(j.whatsappLink, "_blank", "noopener,noreferrer");
      setLeadMsg("تم الإرسال — شكراً لك");
      setLeadName("");
      setLeadPhone("");
    } catch (e) {
      setLeadMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLeadBusy(false);
    }
  };

  const ctaLabel = activeAd?.ctaLabel?.trim() || "احصل على السعر النهائي";

  return (
    <>
      <video ref={preloadPreRef} className="hidden" muted playsInline preload="auto" aria-hidden />
      <video ref={preloadMidRef} className="hidden" muted playsInline preload="auto" aria-hidden />
      <div className={[outerClassName, "relative overflow-hidden"].filter(Boolean).join(" ")}>
        <div
          className={["h-full w-full min-h-0 transition-opacity duration-300 ease-out", activeAd ? "pointer-events-none opacity-0" : "opacity-100"].join(
            " "
          )}
        >
          {children}
        </div>
        {activeAd ? (
          <div
            key={activeAd.id}
            className="absolute inset-0 z-40 flex animate-[revp-ad-overlay-in_0.28s_ease-out_both] flex-col bg-black text-white"
          >
            <div className="px-3 pt-3 md:px-6 md:pt-5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-indigo-500 transition-[width] duration-150 ease-out" style={{ width: `${adProgress}%` }} />
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 md:p-6">
              {activeAd.mediaType === "IMAGE" && activeAd.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeAd.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <video
                  ref={adVideoRef}
                  src={activeAd.videoUrl ?? undefined}
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
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/90 px-3 py-3 md:px-6">
              {activeAd.mediaType === "VIDEO" ? (
                <button
                  type="button"
                  onClick={() => setMuted((v) => !v)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/90"
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
              ) : (
                <span className="text-xs text-white/45">Sponsored</span>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCta}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-300/40 transition hover:bg-emerald-400 hover:ring-emerald-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {ctaLabel}
                </button>
                {skipLabel ? (
                  <div className="relative inline-flex items-center justify-center">
                    {activeAd.skippable && !skipUnlocked && (activeAd.skipAfterSeconds ?? 0) > 0 ? (
                      <svg
                        className="pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] -rotate-90"
                        viewBox="0 0 36 36"
                        aria-hidden
                      >
                        {(() => {
                          const total = Math.max(1, activeAd.skipAfterSeconds);
                          const done = Math.min(1, Math.max(0, (total - skipCountdown) / total));
                          const r = 15;
                          const c = 2 * Math.PI * r;
                          const offset = c * (1 - done);
                          return (
                            <>
                              <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
                              <circle
                                cx="18"
                                cy="18"
                                r={r}
                                fill="none"
                                stroke="rgb(129 140 248)"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeDasharray={c}
                                strokeDashoffset={offset}
                                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                              />
                            </>
                          );
                        })()}
                      </svg>
                    ) : null}
                    <button
                      type="button"
                      disabled={!canSkip}
                      onClick={endAd}
                      className="relative rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/10 disabled:opacity-40"
                    >
                      {skipLabel}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-white/50">Ad</span>
                )}
              </div>
            </div>
            {leadOpen ? (
              <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog">
                <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950 p-5 shadow-2xl">
                  <p className="text-sm font-semibold text-white">{ctaLabel}</p>
                  <p className="mt-1 text-xs text-white/55">أدخل بياناتك وسنتواصل معك.</p>
                  <label className="mt-3 block text-xs text-white/60">
                    الاسم
                    <input
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="mt-2 block text-xs text-white/60">
                    الهاتف
                    <input
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  {leadMsg ? <p className="mt-2 text-xs text-emerald-300">{leadMsg}</p> : null}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-white/20 py-2 text-sm text-white/90"
                      onClick={() => setLeadOpen(false)}
                    >
                      إغلاق
                    </button>
                    <button
                      type="button"
                      disabled={leadBusy || !leadName.trim() || !leadPhone.trim()}
                      className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      onClick={() => void submitLead()}
                    >
                      {leadBusy ? "…" : "إرسال"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
