"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TemplateListItemDto } from "@/lib/video-templates/types";
import { Check } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

function useInView<T extends Element>(opts?: IntersectionObserverInit & { once?: boolean }) {
  const { once = true, ...io } = opts ?? {};
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const hit = entries.some((e) => e.isIntersecting);
      if (hit) {
        setInView(true);
        if (once) observer.disconnect();
      }
    }, io);
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, io.root, io.rootMargin, io.threshold]);

  return { ref, inView };
}

function TemplatePreviewCard({
  tpl,
  selected,
  onPreview,
}: {
  tpl: TemplateListItemDto;
  selected: boolean;
  onPreview: (tpl: TemplateListItemDto) => void;
}) {
  const { t } = useTranslation();
  const kind =
    tpl.type.toLowerCase() === "short" || tpl.type === "SHORT"
      ? t("uploadPage", "templateTypeShort")
      : t("uploadPage", "templateTypeLong");
  const { ref: mediaRef, inView } = useInView<HTMLDivElement>({ rootMargin: "250px", threshold: 0.08 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const hasVideo = Boolean(tpl.previewVideo && tpl.previewVideo.trim());
  const shouldRenderVideo = hasVideo && (inView || hovered);
  const shouldPlay = hasVideo && hovered;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (shouldPlay) {
      void v.play().catch(() => {});
    } else {
      try {
        v.pause();
      } catch {
        // ignore
      }
      setProgressPct(0);
    }
  }, [shouldPlay]);

  useEffect(() => {
    if (!shouldPlay) return;
    const v = videoRef.current;
    if (!v) return;

    let raf = 0;
    const tick = () => {
      const dur = v.duration;
      if (dur && Number.isFinite(dur) && dur > 0) {
        const pct = (v.currentTime / dur) * 100;
        setProgressPct(pct);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [shouldPlay, tpl.id]);

  return (
    <button
      type="button"
      className={[
        "group relative overflow-hidden rounded-xl border bg-white text-left shadow-sm transition",
        "dark:border-slate-700 dark:bg-slate-900",
        selected ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-300 hover:border-indigo-500",
        hovered ? "shadow-indigo-500/10" : "",
      ].join(" ")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") setHovered(true);
      }}
      onPointerUp={(e) => {
        if (e.pointerType === "touch") setHovered(false);
      }}
      onClick={() => onPreview(tpl)}
      aria-label={t("uploadPage", "previewTemplateAria").replace("{{name}}", tpl.name)}
    >
      <div
        ref={mediaRef}
        className="relative h-36 w-full overflow-hidden bg-black"
      >
        {shouldRenderVideo ? (
          <video
            ref={videoRef}
            src={tpl.previewVideo ?? undefined}
            poster={tpl.previewImage}
            muted
            loop
            playsInline
            preload="none"
            className="h-full w-full object-cover opacity-95 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : tpl.previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tpl.previewImage}
            alt=""
            className="h-full w-full object-cover opacity-95 transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-slate-800" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />

        {hasVideo ? (
          <div className="absolute bottom-1 left-2 right-2 h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-400 transition-[width] duration-75"
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            {tpl.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{kind}</p>
        </div>
        {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" /> : null}
      </div>
    </button>
  );
}

export default function TemplateGallery({
  templates,
  selectedTemplateId,
  onPreview,
  error,
}: {
  templates: TemplateListItemDto[];
  selectedTemplateId?: string;
  onPreview: (tpl: TemplateListItemDto) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"all" | "short" | "long">("all");

  const filtered = useMemo(() => {
    if (tab === "all") return templates;
    return templates.filter((tpl) => tpl.type.toLowerCase() === tab);
  }, [templates, tab]);

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "short", "long"] as const).map((k) => {
          const label =
            k === "all"
              ? t("uploadPage", "galleryFilterAll")
              : k === "short"
                ? t("uploadPage", "templateTypeShort")
                : t("uploadPage", "templateTypeLong");
          const active = tab === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((tpl) => (
            <TemplatePreviewCard
              key={tpl.id}
              tpl={tpl}
              selected={selectedTemplateId === tpl.id}
              onPreview={onPreview}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-slate-500 dark:text-slate-400">
          {t("uploadPage", "galleryNoTemplates")}
        </div>
      )}
    </div>
  );
}

