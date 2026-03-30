"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TemplateEngineConfig } from "@/lib/video-templates/types";
import { trackTemplateInteraction } from "@/lib/video-templates/track";

const OVERLAY: Record<string, string> = {
  "gradient-dark": "bg-gradient-to-t from-black via-black/50 to-black/20",
  "vignette-spotlight":
    "bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.82)_100%)]",
  "gold-frame":
    "bg-gradient-to-b from-black/80 via-transparent to-black/90 ring-2 ring-amber-500/40 ring-inset",
  "neon-edge":
    "bg-gradient-to-t from-black via-fuchsia-950/30 to-transparent shadow-[inset_0_0_60px_rgba(217,70,239,0.15)]",
  "letterbox-film":
    "bg-gradient-to-b from-black/90 via-transparent to-black/90",
  "white-minimal":
    "bg-gradient-to-t from-white via-white/95 to-white/40",
  "brand-strip": "bg-gradient-to-b from-black/85 via-black/20 to-black/80",
  "sky-gradient": "bg-gradient-to-t from-sky-950/80 via-transparent to-sky-900/20",
  "midnight-blue": "bg-gradient-to-t from-slate-950 via-blue-950/40 to-transparent",
};

const TRANSITION_MS: Record<string, number> = {
  "luxury-blur-cut": 520,
  "snap-zoom": 380,
  "gold-fade": 900,
  "glitch-lite": 280,
  "cinematic-dissolve": 1200,
  "soft-fade": 800,
  "elegant-slide": 700,
  "parallax-soft": 900,
  "slow-glow": 1100,
};

function titlePositionClass(pos?: string) {
  if (pos === "top") return "items-start pt-6 md:pt-10";
  if (pos === "center") return "items-center justify-center text-center";
  return "items-end pb-8 md:pb-12";
}

function typoClass(t?: string) {
  if (t === "serif-elegant") return "font-serif tracking-wide";
  if (t === "display-gold") return "font-serif font-bold text-amber-200 drop-shadow-lg";
  return "font-sans font-black tracking-tight uppercase";
}

export default function TemplateSlideshow({
  videoId,
  channelId,
  config,
  images,
  audioUrl,
  title,
  priceLine,
  locationLine,
  channelName,
  channelAvatarUrl,
  isShort,
}: {
  videoId: string;
  channelId: string;
  config: TemplateEngineConfig;
  images: string[];
  audioUrl?: string | null;
  title: string;
  priceLine: string;
  locationLine: string;
  channelName: string;
  channelAvatarUrl?: string | null;
  isShort: boolean;
}) {
  const slides = useMemo(() => {
    const list = images.filter(Boolean);
    if (list.length) return list;
    return config.defaultPlaceholders?.length ? config.defaultPlaceholders : [];
  }, [images, config.defaultPlaceholders]);

  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const viewSent = useRef(false);

  const slideMs = config.slideDurationMs ?? 4500;
  const transKey = config.transition ?? "soft-fade";
  const transMs = TRANSITION_MS[transKey] ?? 700;
  const overlayCls = OVERLAY[config.theme?.overlay ?? "gradient-dark"] ?? OVERLAY["gradient-dark"];
  const ken = Boolean(config.kenBurns);
  const minimal = config.theme?.overlay === "white-minimal";

  const advance = useCallback(() => {
    if (slides.length <= 1) return;
    setOut(true);
    window.setTimeout(() => {
      setIdx((i) => (i + 1) % slides.length);
      setOut(false);
    }, transMs);
  }, [slides.length, transMs]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(advance, slideMs);
    return () => window.clearInterval(t);
  }, [advance, slideMs, slides.length]);

  useEffect(() => {
    if (viewSent.current) return;
    viewSent.current = true;
    trackTemplateInteraction(videoId, channelId, "view");
  }, [videoId, channelId]);

  useEffect(() => {
    const url = audioUrl?.trim();
    if (!url) return;
    const el = new Audio(url);
    el.loop = config.audio?.loop ?? true;
    el.volume = config.audio?.volume ?? 0.28;
    audioRef.current = el;
    const play = () => {
      void el.play().catch(() => {});
    };
    const unlock = () => {
      play();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      el.pause();
      audioRef.current = null;
    };
  }, [audioUrl, config.audio?.loop, config.audio?.volume]);

  const posCls = titlePositionClass(config.theme?.titlePosition);
  const typo = typoClass(config.theme?.typography);

  if (!slides.length) {
    return (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-zinc-900 text-zinc-500">
        Add images to this template listing.
      </div>
    );
  }

  const src = slides[idx] ?? slides[0];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes tmplKen { from { transform: scale(1) translate3d(0,0,0); } to { transform: scale(1.1) translate3d(-1%,-1%,0); } }`,
        }}
      />
      <div
        className={[
          "relative w-full overflow-hidden bg-black",
          isShort ? "aspect-[9/16] max-h-[min(88vh,820px)]" : "aspect-video max-h-[min(85vh,900px)]",
        ].join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          sizes={isShort ? "(max-width:768px) 100vw, 420px" : "(max-width:768px) 100vw, min(1200px, 90vw)"}
          className={[
            "absolute inset-0 h-full w-full object-cover transition-[opacity,filter,transform] will-change-[opacity,transform]",
            out ? "opacity-0 scale-[1.03] blur-sm" : "opacity-100 blur-0 scale-100",
            ken ? "motion-safe:[animation:tmplKen_14s_ease-in-out_infinite_alternate]" : "",
          ].join(" ")}
          style={{ transitionDuration: `${transMs}ms` }}
          loading="eager"
          decoding="async"
        />

        {config.grainOpacity ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.35] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
              opacity: config.grainOpacity,
            }}
          />
        ) : null}

        <div className={`pointer-events-none absolute inset-0 z-[2] ${overlayCls}`} />

        {config.showChannelBranding ? (
          <div className="absolute left-0 right-0 top-0 z-[4] flex items-center gap-3 bg-black/55 px-4 py-3 backdrop-blur-md">
            {channelAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channelAvatarUrl} alt="" className="h-9 w-9 rounded-full border border-amber-500/40 object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-amber-500/20" />
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-widest text-amber-200/90">Presented by</p>
              <p className="truncate text-sm font-semibold text-white">{channelName}</p>
            </div>
          </div>
        ) : null}

        <div className={`absolute inset-0 z-[3] flex flex-col justify-end px-4 md:px-8 ${posCls}`}>
          <div className="max-w-full space-y-2">
            {config.showPriceBadge !== false ? (
              <span
                className={[
                  "inline-block rounded-full px-3 py-1 text-xs font-bold md:text-sm",
                  minimal ? "bg-black text-white" : "bg-white/15 text-white backdrop-blur-md",
                ].join(" ")}
              >
                {priceLine}
              </span>
            ) : null}
            <h2
              className={[
                typo,
                "max-w-[95%] text-2xl leading-tight text-balance md:text-4xl",
                minimal ? "text-zinc-900" : "text-white drop-shadow-xl",
              ].join(" ")}
            >
              {title}
            </h2>
            <p
              className={[
                "max-w-xl text-sm md:text-base",
                minimal ? "text-zinc-600" : "text-white/85",
              ].join(" ")}
            >
              {locationLine}
            </p>
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="absolute bottom-3 left-0 right-0 z-[5] flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
