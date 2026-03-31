"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Almarai, Cairo, Inter, Montserrat, Poppins, Tajawal } from "next/font/google";
import { normalizeTemplateConfig } from "@/lib/video-templates/normalize-config";
import type { TemplateSlideAnimation } from "@/lib/video-templates/types";
import { trackTemplateInteraction } from "@/lib/video-templates/track";

const OVERLAY: Record<string, string> = {
  "gradient-dark": "bg-gradient-to-t from-black via-black/50 to-black/20",
  "vignette-spotlight":
    "bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.82)_100%)]",
  "gold-frame":
    "bg-gradient-to-b from-black/80 via-transparent to-black/90 ring-2 ring-amber-500/40 ring-inset",
  "neon-edge":
    "bg-gradient-to-t from-black via-fuchsia-950/30 to-transparent shadow-[inset_0_0_60px_rgba(217,70,239,0.15)]",
  "letterbox-film": "bg-gradient-to-b from-black/90 via-transparent to-black/90",
  "white-minimal": "bg-gradient-to-t from-white via-white/95 to-white/40",
  "brand-strip": "bg-gradient-to-b from-black/85 via-black/20 to-black/80",
};

const TRANS_MS: Record<string, number> = {
  fade: 720,
  blur: 900,
};

const cairo = Cairo({ subsets: ["latin", "arabic"], weight: ["400", "600", "700", "800"], variable: "--font-cairo" });
const tajawal = Tajawal({ subsets: ["latin", "arabic"], weight: ["400", "500", "700", "800"], variable: "--font-tajawal" });
const almarai = Almarai({ subsets: ["arabic"], weight: ["400", "700", "800"], variable: "--font-almarai" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-inter" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-montserrat" });

function typoClass(t?: string) {
  if (t === "serif-elegant") return "font-serif tracking-wide";
  if (t === "display-gold") return "font-serif font-bold text-amber-200 drop-shadow-lg";
  return "font-sans font-black tracking-tight uppercase";
}

function blockPositionClass(pos: string, axis: "title" | "price" | "location") {
  if (pos === "top") return axis === "price" ? "items-start pt-4" : "items-start pt-6 md:pt-10";
  if (pos === "center") return "items-center justify-center text-center";
  return "items-end pb-6 md:pb-10";
}

function blockAnimClass(anim?: string) {
  if (anim === "fade-down") return "animate-[tmplFadeDown_0.7s_ease-out_both]";
  if (anim === "scale-in") return "animate-[tmplScaleIn_0.65s_ease-out_both]";
  return "animate-[tmplFadeUp_0.75s_ease-out_both]";
}

function sceneTextAnimClass(anim?: string) {
  if (anim === "zoom-in") return "animate-[tmplScaleIn_0.6s_ease-out_both]";
  if (anim === "slide-up") return "animate-[tmplFadeUp_0.6s_ease-out_both]";
  return "animate-[tmplFadeStill_0.55s_ease-out_both]";
}

function fontClass(family?: string) {
  switch (family) {
    case "Cairo":
      return cairo.className;
    case "Tajawal":
      return tajawal.className;
    case "Almarai":
      return almarai.className;
    case "Poppins":
      return poppins.className;
    case "Inter":
      return inter.className;
    case "Montserrat":
      return montserrat.className;
    default:
      return "";
  }
}

function fontFamilyValue(family?: string): string | undefined {
  switch (family) {
    case "Cairo":
      return "var(--font-cairo), sans-serif";
    case "Tajawal":
      return "var(--font-tajawal), sans-serif";
    case "Almarai":
      return "var(--font-almarai), sans-serif";
    case "Poppins":
      return "var(--font-poppins), sans-serif";
    case "Inter":
      return "var(--font-inter), sans-serif";
    case "Montserrat":
      return "var(--font-montserrat), sans-serif";
    default:
      return undefined;
  }
}

function fontWeightValue(weight?: string): CSSProperties["fontWeight"] {
  switch (weight) {
    case "normal":
      return 400;
    case "medium":
      return 500;
    case "semibold":
      return 600;
    case "bold":
      return 700;
    case "800":
      return 800;
    case "900":
      return 900;
    default:
      return undefined;
  }
}

function slideMotionStyle(anim: TemplateSlideAnimation, durationSec: number): React.CSSProperties {
  const t = `${durationSec}s`;
  const ease = "ease-in-out";
  switch (anim) {
    case "zoom-in":
      return { animation: `tmplZoomIn ${t} ${ease} forwards` };
    case "zoom-out":
      return { animation: `tmplZoomOut ${t} ${ease} forwards` };
    case "pan-left":
      return { animation: `tmplPanLeft ${t} ${ease} forwards` };
    case "pan-right":
      return { animation: `tmplPanRight ${t} ${ease} forwards` };
    case "blur":
      return { animation: `tmplBlurPulse ${t} ${ease} forwards` };
    case "fade":
    default:
      return { animation: `tmplFadeStill ${t} ${ease} forwards` };
  }
}

export type TemplateMotionPlayerProps = {
  config: unknown;
  images: string[];
  audioUrl?: string | null;
  fallbackAudioUrl?: string | null;
  title: string;
  priceLine: string;
  locationLine: string;
  isShort: boolean;
  /**
   * Controls whether slide transitions + audio are actively playing.
   * Used for gallery cinematic previews (play/pause controls).
   */
  isPlaying?: boolean;
  /** Mute the template audio (volume becomes 0). */
  muted?: boolean;
  /** Volume override in [0..1]. If omitted, uses config audio volume. */
  volume?: number;
  channelName?: string;
  channelAvatarUrl?: string | null;
  trackView?: { videoId: string; channelId: string };
  previewMode?: boolean;
};

export default function TemplateMotionPlayer({
  config: rawConfig,
  images,
  audioUrl,
  fallbackAudioUrl,
  title,
  priceLine,
  locationLine,
  isShort,
  isPlaying = true,
  muted = false,
  volume: volumeOverride,
  channelName = "Channel",
  channelAvatarUrl,
  trackView,
  previewMode,
}: TemplateMotionPlayerProps) {
  const cfg = useMemo(() => normalizeTemplateConfig(rawConfig), [rawConfig]);
  const slides = cfg.slides;
  const transKey = cfg.transition === "blur" ? "blur" : "fade";
  const transMs = TRANS_MS[transKey] ?? 720;

  const resolvedAudio = (audioUrl?.trim() || fallbackAudioUrl?.trim() || "").trim() || null;
  const isPlayingRef = useRef(isPlaying);
  const unlockedRef = useRef<boolean>(Boolean(previewMode));
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    unlockedRef.current = Boolean(previewMode);
  }, [previewMode]);

  const effectiveVolume = muted
    ? 0
    : typeof volumeOverride === "number"
      ? Math.min(1, Math.max(0, volumeOverride))
      : cfg.audio?.volume ?? 0.32;

  const displayImages = useMemo(() => {
    const list = images.filter(Boolean);
    if (list.length) return list;
    return cfg.defaultPlaceholders?.length ? cfg.defaultPlaceholders : [];
  }, [images, cfg.defaultPlaceholders]);

  const [slideIdx, setSlideIdx] = useState(0);
  const [exiting, setExiting] = useState(false);
  const timersRef = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const viewSent = useRef(false);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const advance = useCallback(() => {
    if (slides.length <= 1) return;
    if (!isPlayingRef.current) return;
    setExiting(true);
    const t1 = window.setTimeout(() => {
      setSlideIdx((i) => {
        const next = (i + 1) % slides.length;
        if (next === 0) {
          const a = audioRef.current;
          if (a) {
            a.currentTime = 0;
            void a.play().catch(() => {});
          }
        }
        return next;
      });
      setExiting(false);
    }, transMs);
    timersRef.current.push(t1);
  }, [slides.length, transMs]);

  useEffect(() => {
    clearTimers();
    if (!isPlaying || slides.length <= 1) return;
    const slide = slides[slideIdx];
    const dur = (slide?.duration ?? 2) * 1000;
    const t = window.setTimeout(advance, dur);
    timersRef.current.push(t);
    return clearTimers;
  }, [slideIdx, slides, advance, clearTimers, isPlaying]);

  useEffect(() => {
    if (isPlaying) return;
    // Stop any fade-out state so paused frames look stable.
    setExiting(false);
  }, [isPlaying]);

  useEffect(() => {
    if (!trackView || viewSent.current) return;
    viewSent.current = true;
    trackTemplateInteraction(trackView.videoId, trackView.channelId, "view");
  }, [trackView]);

  useEffect(() => {
    if (!resolvedAudio) return;
    const el = new Audio(resolvedAudio);
    el.loop = cfg.audio?.loop ?? true;
    el.volume = effectiveVolume;
    audioRef.current = el;

    const tryPlay = () => void el.play().catch(() => {});

    if (previewMode) {
      // In preview mode we allow autoplay, but still respect isPlaying.
      if (isPlayingRef.current) tryPlay();
      unlockedRef.current = true;
    } else {
      const unlock = () => {
        unlockedRef.current = true;
        if (isPlayingRef.current) tryPlay();
        window.removeEventListener("pointerdown", unlock);
      };
      window.addEventListener("pointerdown", unlock, { once: true });
    }

    return () => {
      el.pause();
      audioRef.current = null;
    };
  }, [resolvedAudio, cfg.audio?.loop, previewMode]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = effectiveVolume;
  }, [effectiveVolume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !resolvedAudio) return;
    if (isPlaying) {
      if (previewMode || unlockedRef.current) {
        void el.play().catch(() => {});
      }
    } else {
      el.pause();
    }
  }, [isPlaying, previewMode, resolvedAudio]);

  const overlayCls =
    OVERLAY[cfg.theme?.overlay ?? "gradient-dark"] ?? OVERLAY["gradient-dark"];
  const minimal = cfg.theme?.overlay === "white-minimal";
  const typo = typoClass(cfg.theme?.typography);

  const titlePos = cfg.overlay?.title?.position ?? cfg.theme?.titlePosition ?? "bottom";
  const pricePos = cfg.overlay?.price?.position ?? "bottom";
  const locPos = cfg.overlay?.location?.position ?? "bottom";

  const src = displayImages[slideIdx % displayImages.length] ?? displayImages[0];
  const slide = slides[slideIdx] ?? slides[0];
  const scene = cfg.scenes?.[slideIdx] ?? cfg.scenes?.[slideIdx % (cfg.scenes?.length || 1)];
  const sceneSrc = scene?.image?.trim() || src;
  const motionStyle = slide ? slideMotionStyle(slide.animation, slide.duration) : {};
  const fontCfg = cfg.font;
  const fontCls = fontClass(fontCfg?.family);
  const textAlignClass =
    fontCfg?.align === "left" ? "text-left" : fontCfg?.align === "right" ? "text-right" : "text-center";
  const fontStyle: CSSProperties = {
    fontFamily: fontFamilyValue(fontCfg?.family),
    fontSize: typeof fontCfg?.size === "number" ? `${fontCfg.size}px` : undefined,
    color: fontCfg?.color,
    fontWeight: fontWeightValue(fontCfg?.weight),
    textAlign: fontCfg?.align ?? undefined,
  };

  if (!displayImages.length) {
    return (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-zinc-900 text-zinc-500">
        Add images to this template listing.
      </div>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes tmplZoomIn { from { transform: scale(1) translate3d(0,0,0); } to { transform: scale(1.14) translate3d(0,0,0); } }
@keyframes tmplZoomOut { from { transform: scale(1.12) translate3d(0,0,0); } to { transform: scale(1) translate3d(0,0,0); } }
@keyframes tmplPanLeft { from { transform: scale(1.08) translate3d(4%,0,0); } to { transform: scale(1.08) translate3d(-4%,0,0); } }
@keyframes tmplPanRight { from { transform: scale(1.08) translate3d(-4%,0,0); } to { transform: scale(1.08) translate3d(4%,0,0); } }
@keyframes tmplBlurPulse { 0%,100% { filter: blur(0); transform: scale(1) translate3d(0,0,0); } 50% { filter: blur(6px); transform: scale(1.06) translate3d(0,0,0); } }
@keyframes tmplFadeStill { from { opacity: 0.92; transform: scale(1) translate3d(0,0,0); } to { opacity: 1; transform: scale(1.03) translate3d(0,0,0); } }
@keyframes tmplFadeUp { from { opacity: 0; transform: translate3d(0,12px,0); } to { opacity: 1; transform: translate3d(0,0,0); } }
@keyframes tmplFadeDown { from { opacity: 0; transform: translate3d(0,-12px,0); } to { opacity: 1; transform: translate3d(0,0,0); } }
@keyframes tmplScaleIn { from { opacity: 0; transform: scale(0.92) translate3d(0,0,0); } to { opacity: 1; transform: scale(1) translate3d(0,0,0); } }
`,
        }}
      />
      <div
        className={[
          "relative w-full overflow-hidden bg-black",
          cairo.variable,
          tajawal.variable,
          almarai.variable,
          poppins.variable,
          inter.variable,
          montserrat.variable,
          isShort ? "aspect-[9/16] max-h-[min(88vh,820px)]" : "aspect-video max-h-[min(85vh,900px)]",
        ].join(" ")}
      >
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            ...motionStyle,
            transitionProperty: "opacity, filter, transform",
            transitionDuration: `${transMs}ms`,
            opacity: exiting ? 0 : 1,
            filter: exiting ? (transKey === "blur" ? "blur(14px)" : "blur(0px)") : "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`${slideIdx}-${sceneSrc}`}
            src={sceneSrc}
            alt=""
            sizes={isShort ? "(max-width:768px) 100vw, 420px" : "(max-width:768px) 100vw, min(1200px, 90vw)"}
            className="h-full w-full object-cover"
            style={{ transform: "translateZ(0)" }}
            loading="eager"
            decoding="async"
          />
        </div>

        {cfg.grainOpacity ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.35] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
              opacity: cfg.grainOpacity,
            }}
          />
        ) : null}

        <div className={`pointer-events-none absolute inset-0 z-[2] ${overlayCls}`} />

        {cfg.showChannelBranding ? (
          <div className="absolute left-0 right-0 top-0 z-[4] flex items-center gap-3 bg-black/55 px-4 py-3 backdrop-blur-md">
            {channelAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channelAvatarUrl}
                alt=""
                className="h-9 w-9 rounded-full border border-amber-500/40 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-amber-500/20" />
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-widest text-amber-200/90">Presented by</p>
              <p className="truncate text-sm font-semibold text-white">{channelName}</p>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col justify-between px-4 md:px-8">
          {scene?.textLayers?.length ? (
            <div className="absolute inset-0 z-[6] flex flex-col px-4 md:px-8">
              {scene.textLayers.map((layer, idx) => {
                const posCls =
                  layer.position === "top"
                    ? "pt-8 items-center"
                    : layer.position === "bottom"
                      ? "mt-auto pb-12 items-center"
                      : "my-auto items-center";
                return (
                  <div key={`${slideIdx}-${idx}-${layer.text}`} className={`flex ${posCls}`}>
                    <p
                      className={[
                        "max-w-[92%] text-balance drop-shadow-2xl",
                        sceneTextAnimClass(layer.animation),
                        textAlignClass,
                        fontCls,
                      ].join(" ")}
                      style={fontStyle}
                    >
                      {layer.text}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className={`flex min-h-0 flex-1 flex-col ${blockPositionClass(titlePos, "title")}`}>
            <div
              key={`t-${slideIdx}`}
              className={`max-w-full space-y-2 ${blockAnimClass(cfg.overlay?.title?.animation)} ${titlePos === "center" ? "text-center" : ""}`}
            >
              <h2
                className={[
                  typo,
                  "max-w-[95%] text-2xl leading-tight text-balance md:text-4xl",
                  minimal ? "text-zinc-900" : "text-white drop-shadow-xl",
                  fontCls,
                  textAlignClass,
                ].join(" ")}
                style={fontStyle}
              >
                {title}
              </h2>
            </div>
          </div>

          <div className={`flex flex-col gap-2 pb-1 ${pricePos === "top" ? "order-first pt-4" : ""}`}>
            {cfg.showPriceBadge !== false ? (
              <div
                key={`p-${slideIdx}`}
                className={`flex ${pricePos === "center" ? "justify-center" : ""} ${blockAnimClass(cfg.overlay?.price?.animation)}`}
              >
                <span
                  className={[
                    "inline-block rounded-full px-3 py-1 text-xs font-bold md:text-sm",
                    minimal ? "bg-black text-white" : "bg-white/15 text-white backdrop-blur-md",
                    fontCls,
                    textAlignClass,
                  ].join(" ")}
                  style={fontStyle}
                >
                  {priceLine}
                </span>
              </div>
            ) : null}
            <div
              key={`l-${slideIdx}`}
              className={`${blockAnimClass(cfg.overlay?.location?.animation)} ${locPos === "center" ? "text-center" : ""}`}
            >
              <p
                className={[
                  "max-w-xl text-sm md:text-base",
                  minimal ? "text-zinc-600" : "text-white/85",
                  fontCls,
                  textAlignClass,
                ].join(" ")}
                style={fontStyle}
              >
                {locationLine}
              </p>
            </div>
          </div>
        </div>

        {displayImages.length > 1 && slides.length > 1 ? (
          <div className="absolute bottom-3 left-0 right-0 z-[5] flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-colors ${i === slideIdx ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        ) : null}

      </div>
    </>
  );
}
