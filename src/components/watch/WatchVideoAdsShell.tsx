"use client";

import * as React from "react";
import type { AdType } from "@prisma/client";
import { getOrCreateAdViewerKey } from "@/lib/ads-client/viewer-key";
import type { ServedVideoAdPayload } from "@/lib/video-ads/served-ad-payload";

type ServedVideoAd = ServedVideoAdPayload;

const MIN_AD_GAP_SECONDS = 30;
const OVERLAY_INTERVAL_MIN = 45;
const OVERLAY_INTERVAL_MAX = 60;
const OVERLAY_AUTO_HIDE_SECONDS = 8;
const SEEN_ADS_KEY = "seen_ads";

function normalizeFetchedAd(ad: ServedVideoAd | null): ServedVideoAd | null {
  if (!ad) return null;
  const adType =
    ad.adType ??
    ((ad.type === "MID_ROLL" ? "MID_ROLL" : "PRE_ROLL_SKIPPABLE") as AdType);
  return { ...ad, adType };
}

function isLinearCreative(ad: ServedVideoAd): boolean {
  const t = ad.adType;
  return t === "PRE_ROLL_SKIPPABLE" || t === "PRE_ROLL_NON_SKIPPABLE" || t === "MID_ROLL";
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function getSeenAds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_ADS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function setSeenAds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_ADS_KEY, JSON.stringify(ids.slice(-120)));
  } catch {
    // ignore
  }
}

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

async function fetchAd(videoId: string, slot: string, viewerKey: string) {
  const q = new URLSearchParams({
    videoId,
    slot,
  });
  if (viewerKey) q.set("viewerKey", viewerKey);
  const res = await fetch(`/api/ads/for-video?${q.toString()}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return normalizeFetchedAd((data?.ad || null) as ServedVideoAd | null);
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
  const [overlayAd, setOverlayAd] = React.useState<ServedVideoAd | null>(null);
  const [ctaAd, setCtaAd] = React.useState<ServedVideoAd | null>(null);
  const [linearActiveAd, setLinearActiveAd] = React.useState<ServedVideoAd | null>(null);
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [ctaDockVisible, setCtaDockVisible] = React.useState(false);
  const [adProgress, setAdProgress] = React.useState(0);
  const [skipCountdown, setSkipCountdown] = React.useState(0);
  const [skipUnlocked, setSkipUnlocked] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [mainDuration, setMainDuration] = React.useState(0);
  const [isShortVideo, setIsShortVideo] = React.useState(false);
  const [leadOpen, setLeadOpen] = React.useState(false);
  const [leadTargetAd, setLeadTargetAd] = React.useState<ServedVideoAd | null>(null);
  const [leadName, setLeadName] = React.useState("");
  const [leadPhone, setLeadPhone] = React.useState("");
  const [leadBusy, setLeadBusy] = React.useState(false);
  const [leadMsg, setLeadMsg] = React.useState<string | null>(null);

  const midFiredRef = React.useRef<Record<number, boolean>>({});
  const adVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const preloadPreRef = React.useRef<HTMLVideoElement | null>(null);
  const preloadMidRef = React.useRef<HTMLVideoElement | null>(null);
  const preloadOverlayRef = React.useRef<HTMLVideoElement | null>(null);
  const viewSentRef = React.useRef(false);
  const adStartTimeRef = React.useRef(0);
  const viewerKeyRef = React.useRef("");
  const linearActiveRef = React.useRef<ServedVideoAd | null>(null);
  const overlayImpressionSentRef = React.useRef(false);
  const ctaImpressionSentRef = React.useRef(false);
  const lastMainTimeupdateLogRef = React.useRef(0);
  const nextOverlayAtSecRef = React.useRef<number | null>(null);
  const lastAdShownAtSecRef = React.useRef(-999);
  const overlayShownRef = React.useRef(false);
  const sidePopupShownRef = React.useRef(false);
  const chosenMidRollCuesRef = React.useRef<number[]>([]);
  const chosenPreAdIdRef = React.useRef<string | null>(null);

  React.useLayoutEffect(() => {
    viewerKeyRef.current = getOrCreateAdViewerKey();
  }, []);

  const currentMainTimeSec = React.useCallback(() => {
    const t = videoRef?.current?.currentTime;
    return Number.isFinite(t) ? Number(t) : 0;
  }, [videoRef]);

  const canShowAnotherAdNow = React.useCallback(
    (atSec: number) => atSec - lastAdShownAtSecRef.current >= MIN_AD_GAP_SECONDS,
    []
  );

  const markAdShownNow = React.useCallback(
    (atSec?: number) => {
      const t = Number.isFinite(atSec) ? Number(atSec) : currentMainTimeSec();
      lastAdShownAtSecRef.current = t;
    },
    [currentMainTimeSec]
  );

  React.useEffect(() => {
    midFiredRef.current = {};
    lastMainTimeupdateLogRef.current = 0;
    nextOverlayAtSecRef.current = null;
    lastAdShownAtSecRef.current = -999;
    overlayShownRef.current = false;
    sidePopupShownRef.current = false;
    chosenMidRollCuesRef.current = [];
    chosenPreAdIdRef.current = null;
  }, [watchVideoId]);

  React.useEffect(() => {
    linearActiveRef.current = linearActiveAd;
  }, [linearActiveAd]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el) return;
    const onMeta = () => {
      const d = Number(el.duration) || 0;
      setMainDuration(d);
      const vertical = (el.videoHeight || 0) > 0 && (el.videoWidth || 0) > 0 && el.videoHeight > el.videoWidth;
      setIsShortVideo(vertical || (Number.isFinite(d) && d > 0 && d < 60));
    };
    el.addEventListener("loadedmetadata", onMeta);
    onMeta();
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [videoRef, watchVideoId, children]);

  React.useEffect(() => {
    if (!watchVideoId) return;
    const vk = viewerKeyRef.current || getOrCreateAdViewerKey();
    void Promise.all([
      fetchAd(watchVideoId, "PRE_ROLL", vk),
      fetchAd(watchVideoId, "MID_ROLL", vk),
      fetchAd(watchVideoId, "OVERLAY", vk),
      fetchAd(watchVideoId, "CTA", vk),
    ]).then(([pre, mid, ov, cta]) => {
      console.log("Ads fetched:", { preRoll: pre, midRoll: mid, overlay: ov, cta });
      const seen = getSeenAds();
      const seenSet = new Set(seen);
      const candidates = [pre, mid, ov, cta].filter((x): x is ServedVideoAd => Boolean(x));
      const unseen = candidates.filter((x) => !seen.includes(x.id));
      if (!unseen.length && candidates.length) {
        // Rotate again once the known local pool is exhausted.
        setSeenAds([]);
        seenSet.clear();
      }

      const duration = mainDuration;
      const shortLike = isShortVideo || (Number.isFinite(duration) && duration > 0 && duration < 60);
      const veryShort = Number.isFinite(duration) && duration > 0 && duration < 30;
      const medium = Number.isFinite(duration) && duration >= 30 && duration <= 90;
      const long = Number.isFinite(duration) && duration > 90;

      const preCandidate = pre && adCanDisplay(pre) && isLinearCreative(pre) && !seenSet.has(pre.id) ? pre : null;
      const midCandidate = mid && adCanDisplay(mid) && isLinearCreative(mid) && !seenSet.has(mid.id) ? mid : null;
      const overlayCandidate = ov && adCanDisplay(ov) && !seenSet.has(ov.id) ? ov : null;
      const popupCandidate = cta && !seenSet.has(cta.id) ? cta : null;

      let nextPre: ServedVideoAd | null = preCandidate;
      let nextOverlay: ServedVideoAd | null = overlayCandidate;
      let nextMid: ServedVideoAd | null = midCandidate;
      let nextPopup: ServedVideoAd | null = popupCandidate;

      if (shortLike) {
        nextMid = null;
      }
      if (veryShort || shortLike) {
        // For short videos: only pre-roll OR one small overlay.
        const pick = shuffle([preCandidate, overlayCandidate].filter((x): x is ServedVideoAd => Boolean(x)))[0] ?? null;
        if (pick?.id === preCandidate?.id) {
          nextPre = preCandidate;
          nextOverlay = null;
        } else {
          nextPre = null;
          nextOverlay = overlayCandidate;
        }
        nextPopup = null;
      } else if (medium) {
        nextOverlay = null;
        nextPopup = null;
      } else if (!long) {
        nextOverlay = null;
        nextPopup = null;
      }

      setPreRollAd(nextPre);
      setMidRollAd(nextMid);
      setOverlayAd(nextOverlay);
      setCtaAd(nextPopup);
      overlayImpressionSentRef.current = false;
      ctaImpressionSentRef.current = false;
      setOverlayOpen(false);
      setCtaDockVisible(false);
      if (nextPre && adCanDisplay(nextPre) && isLinearCreative(nextPre)) {
        console.log("Ad type:", nextPre.adType);
        trackImpression(nextPre.id, vk);
        markAdShownNow(0);
        setSeenAds([...getSeenAds(), nextPre.id]);
        viewSentRef.current = false;
        adStartTimeRef.current = typeof performance !== "undefined" ? performance.now() : 0;
        chosenPreAdIdRef.current = nextPre.id;
        setLinearActiveAd(nextPre);
        setAdProgress(0);
      }
    });
  }, [watchVideoId, mainDuration, isShortVideo, markAdShownNow]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el || !linearActiveAd) return;
    try {
      el.pause();
    } catch {
      // ignore
    }
  }, [linearActiveAd, videoRef]);

  React.useEffect(() => {
    if (!linearActiveAd) {
      setSkipUnlocked(false);
      setSkipCountdown(0);
      return;
    }
    if (!linearActiveAd.skippable) {
      setSkipUnlocked(false);
      setSkipCountdown(0);
      return;
    }
    const sec = Math.max(0, linearActiveAd.skipAfterSeconds);
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
  }, [linearActiveAd?.id, linearActiveAd?.skippable, linearActiveAd?.skipAfterSeconds]);

  const endAd = React.useCallback(() => {
    const cur = linearActiveAd;
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
    setLinearActiveAd(null);
    setAdProgress(0);
    setLeadOpen(false);
    setLeadTargetAd(null);
    const el = videoRef?.current;
    if (el) void el.play().catch(() => {});
  }, [linearActiveAd, videoRef]);

  React.useEffect(() => {
    if (!linearActiveAd) return;
    if (!adCanDisplay(linearActiveAd)) {
      endAd();
    }
  }, [linearActiveAd, endAd]);

  React.useEffect(() => {
    if (!linearActiveAd || linearActiveAd.mediaType !== "IMAGE") return;
    const sec = Math.max(3, Math.min(120, Number(linearActiveAd.durationSeconds) || 8));
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
  }, [linearActiveAd, endAd]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el || !midRollAd || linearActiveAd) return;
    if (!isLinearCreative(midRollAd) || !adCanDisplay(midRollAd)) return;
    if (isShortVideo) return;

    const d = mainDuration;
    if (!Number.isFinite(d) || d <= 0) return;
    let cues: number[] = [];
    if (d < 30) {
      cues = [];
    } else if (d <= 90) {
      cues = [d * 0.5];
    } else {
      cues = [60, 120].filter((sec) => sec < d);
    }
    chosenMidRollCuesRef.current = cues;
    if (!cues.length) return;

    const onTime = () => {
      const currentTime = Number(el.currentTime || 0);
      for (const threshold of cues) {
        const key = Math.round(threshold);
        if (midFiredRef.current[key]) continue;
        if (currentTime < threshold) continue;
        if (!canShowAnotherAdNow(currentTime)) continue;
        midFiredRef.current[key] = true;
        console.log("Ad triggered at:", currentTime);
        console.log("Ad type:", midRollAd.adType);
        trackImpression(midRollAd.id, viewerKeyRef.current || getOrCreateAdViewerKey());
        markAdShownNow(currentTime);
        setSeenAds([...getSeenAds(), midRollAd.id]);
        viewSentRef.current = false;
        adStartTimeRef.current = typeof performance !== "undefined" ? performance.now() : 0;
        setLinearActiveAd(midRollAd);
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
  }, [videoRef, midRollAd, linearActiveAd, mainDuration, isShortVideo, canShowAnotherAdNow, markAdShownNow]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el) return;
    const nextOverlayGap = () =>
      OVERLAY_INTERVAL_MIN + Math.floor(Math.random() * (OVERLAY_INTERVAL_MAX - OVERLAY_INTERVAL_MIN + 1));
    const scheduleNextOverlay = (base: number) => {
      nextOverlayAtSecRef.current = base + nextOverlayGap();
    };
    if (nextOverlayAtSecRef.current == null) {
      scheduleNextOverlay(0);
    }

    const onPlay = () => {
      console.log("watch: main video onPlay");
    };

    const onPause = () => {
      console.log("watch: main video onPause");
    };

    const onTimeUpdate = () => {
      const currentTime = Number(el.currentTime || 0);
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastMainTimeupdateLogRef.current >= 8000) {
        lastMainTimeupdateLogRef.current = now;
        console.log("watch: main video onTimeUpdate", currentTime);
      }
      if (linearActiveRef.current) return;

      if (
        overlayAd &&
        !overlayShownRef.current &&
        adCanDisplay(overlayAd) &&
        ((isShortVideo && !chosenPreAdIdRef.current && currentTime >= 3) ||
          (!isShortVideo && nextOverlayAtSecRef.current != null && currentTime >= nextOverlayAtSecRef.current)) &&
        canShowAnotherAdNow(currentTime)
      ) {
        setOverlayOpen(true);
        overlayShownRef.current = true;
        markAdShownNow(currentTime);
        setSeenAds([...getSeenAds(), overlayAd.id]);
        scheduleNextOverlay(currentTime);
      }

      if (
        ctaAd &&
        !sidePopupShownRef.current &&
        !isShortVideo &&
        !overlayOpen &&
        currentTime >= 10 &&
        canShowAnotherAdNow(currentTime)
      ) {
        setCtaDockVisible(true);
        sidePopupShownRef.current = true;
      }
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoRef, overlayAd, ctaAd, overlayOpen, canShowAnotherAdNow, isShortVideo, markAdShownNow]);

  React.useEffect(() => {
    if (!overlayOpen || !overlayAd || overlayImpressionSentRef.current) return;
    overlayImpressionSentRef.current = true;
    const vk = viewerKeyRef.current || getOrCreateAdViewerKey();
    console.log("Ad type:", overlayAd.adType, "(overlay visible)");
    trackImpression(overlayAd.id, vk);
  }, [overlayOpen, overlayAd]);

  React.useEffect(() => {
    if (!overlayOpen) return;
    const id = window.setTimeout(() => setOverlayOpen(false), OVERLAY_AUTO_HIDE_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [overlayOpen]);

  React.useEffect(() => {
    if (!ctaDockVisible || !ctaAd || ctaImpressionSentRef.current) return;
    ctaImpressionSentRef.current = true;
    const vk = viewerKeyRef.current || getOrCreateAdViewerKey();
    console.log("Ad type:", ctaAd.adType, "(CTA dock visible)");
    trackImpression(ctaAd.id, vk);
    setSeenAds([...getSeenAds(), ctaAd.id]);
  }, [ctaDockVisible, ctaAd]);

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

  React.useEffect(() => {
    const url = overlayAd?.mediaType === "VIDEO" ? overlayAd.videoUrl : null;
    if (!url || !isLikelyPlayableVideoUrl(url)) return;
    const v = preloadOverlayRef.current;
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
  }, [overlayAd]);

  React.useEffect(() => {
    if (linearActiveAd) {
      setOverlayOpen(false);
      setCtaDockVisible(false);
    }
  }, [linearActiveAd]);

  React.useEffect(() => {
    if (overlayOpen) {
      setCtaDockVisible(false);
    }
  }, [overlayOpen]);

  const canSkip = Boolean(linearActiveAd?.skippable && skipUnlocked);
  const skipLabel = linearActiveAd?.skippable
    ? canSkip
      ? "Skip Ad"
      : `Skip in ${skipCountdown}s`
    : null;

  const handleCtaForAd = (ad: ServedVideoAd | null) => {
    if (!ad) return;
    trackClick(ad.id);
    const url = (ad.ctaUrl || "").trim();
    if (ad.ctaType === "BOOK_VISIT" && url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (ad.ctaType === "WHATSAPP" && url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (ad.ctaType === "CALL" && url) {
      window.location.href = url.startsWith("tel:") ? url : `tel:${url}`;
      return;
    }
    setLeadTargetAd(ad);
    setLeadOpen(true);
    setLeadMsg(null);
  };

  const submitLead = async () => {
    const target = leadTargetAd ?? linearActiveAd;
    if (!target) return;
    setLeadBusy(true);
    setLeadMsg(null);
    try {
      const res = await fetch("/api/ads/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          adId: target.id,
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

  const ctaLabel = linearActiveAd?.ctaLabel?.trim() || "احصل على السعر النهائي";
  const leadCtaLabel = (leadTargetAd ?? linearActiveAd)?.ctaLabel?.trim() || "احصل على السعر النهائي";

  const overlayCtaLabel = overlayAd?.ctaLabel?.trim() || "اعرف المزيد";
  const dockCtaLabel = ctaAd?.ctaLabel?.trim() || "احصل على السعر النهائي";

  const renderLinearTakeover = () => {
    const ad = linearActiveAd;
    if (!ad || !isLinearCreative(ad)) return null;
    return (
      <div
        key={ad.id}
        className="absolute inset-0 z-40 flex animate-[revp-ad-overlay-in_0.28s_ease-out_both] flex-col bg-black text-white"
      >
        <div className="px-3 pt-3 md:px-6 md:pt-5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-indigo-500 transition-[width] duration-150 ease-out" style={{ width: `${adProgress}%` }} />
          </div>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 md:p-6">
          {ad.mediaType === "IMAGE" && ad.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <video
              ref={adVideoRef}
              src={ad.videoUrl ?? undefined}
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
          {ad.mediaType === "VIDEO" ? (
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
              onClick={() => handleCtaForAd(ad)}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-300/40 transition hover:bg-emerald-400 hover:ring-emerald-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {ctaLabel}
            </button>
            {skipLabel ? (
              <div className="relative inline-flex items-center justify-center">
                {ad.skippable && !skipUnlocked && (ad.skipAfterSeconds ?? 0) > 0 ? (
                  <svg
                    className="pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] -rotate-90"
                    viewBox="0 0 36 36"
                    aria-hidden
                  >
                    {(() => {
                      const total = Math.max(1, ad.skipAfterSeconds);
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
      </div>
    );
  };

  return (
    <>
      <video ref={preloadPreRef} className="hidden" muted playsInline preload="auto" aria-hidden />
      <video ref={preloadMidRef} className="hidden" muted playsInline preload="auto" aria-hidden />
      <video ref={preloadOverlayRef} className="hidden" muted playsInline preload="auto" aria-hidden />
      <div className={[outerClassName, "relative overflow-hidden"].filter(Boolean).join(" ")}>
        <div
          className={[
            "h-full w-full min-h-0 transition-opacity duration-300 ease-out",
            linearActiveAd ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
        >
          {children}
        </div>
        {!linearActiveAd && overlayOpen && overlayAd ? (
          <div
            key={overlayAd.id}
            className="pointer-events-auto absolute inset-x-2 bottom-2 z-[35] mx-auto flex w-[calc(100%-16px)] max-w-4xl animate-[revp-ad-overlay-in_0.28s_ease-out_both] flex-col overflow-hidden rounded-xl border border-white/20 bg-black/80 shadow-2xl shadow-black/60 backdrop-blur-md sm:inset-x-4 sm:w-[calc(100%-32px)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
              <span className="truncate pl-1 text-[10px] font-medium uppercase tracking-wide text-white/50">Sponsored</span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                onClick={() => setOverlayOpen(false)}
                aria-label="Dismiss ad"
              >
                ✕
              </button>
            </div>
            <div className="relative w-full bg-black/40" style={{ maxHeight: "20vh", minHeight: "64px" }}>
              {overlayAd.mediaType === "IMAGE" && overlayAd.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={overlayAd.imageUrl} alt="" className="h-full max-h-[20vh] w-full object-contain" />
              ) : overlayAd.videoUrl ? (
                <video
                  className="h-full max-h-[20vh] w-full object-contain"
                  src={overlayAd.videoUrl}
                  muted
                  playsInline
                  autoPlay
                  loop
                  preload="auto"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-white/10 p-2">
              <button
                type="button"
                onClick={() => handleCtaForAd(overlayAd)}
                className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-center text-xs font-bold text-white shadow-md transition hover:bg-emerald-400"
              >
                {overlayCtaLabel}
              </button>
            </div>
          </div>
        ) : null}
        {!linearActiveAd && ctaDockVisible && ctaAd ? (
          <div className="pointer-events-auto absolute bottom-3 right-3 z-[36] w-full max-w-[300px] animate-[revp-ad-overlay-in_0.28s_ease-out_both]">
            <div className="overflow-hidden rounded-xl border border-white/20 bg-black/70 shadow-lg shadow-black/50 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-white/60">Sponsored</span>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-xs text-white/70 hover:bg-white/10"
                  onClick={() => setCtaDockVisible(false)}
                  aria-label="Close popup ad"
                >
                  ✕
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleCtaForAd(ctaAd)}
                className="w-full bg-emerald-600/95 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
              >
                {dockCtaLabel}
              </button>
            </div>
          </div>
        ) : null}
        {renderLinearTakeover()}
      </div>
      {leadOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950 p-5 shadow-2xl">
            <p className="text-sm font-semibold text-white">{leadCtaLabel}</p>
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
                onClick={() => {
                  setLeadOpen(false);
                  setLeadTargetAd(null);
                }}
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
    </>
  );
}
