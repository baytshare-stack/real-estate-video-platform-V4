"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import TemplateMotionPlayer from "@/components/video/TemplateMotionPlayer";
import { normalizeTemplateConfig } from "@/lib/video-templates/normalize-config";
import type { TemplateListItemDto } from "@/lib/video-templates/types";

export default function TemplateCinematicPreviewModal({
  template,
  isOpen,
  listingTitle,
  priceLine,
  locationLine,
  onClose,
  onUseTemplate,
}: {
  template: TemplateListItemDto;
  isOpen: boolean;
  listingTitle: string;
  priceLine: string;
  locationLine: string;
  onClose: () => void;
  onUseTemplate: (tpl: TemplateListItemDto) => void;
}) {
  const cfg = useMemo(() => normalizeTemplateConfig(template.config), [template.config]);
  const initialVolume = cfg.audio?.volume ?? 0.32;

  const slidesCount = Math.max(1, Math.min(12, cfg.slides.length || 1));
  const images = useMemo(
    () => Array.from({ length: slidesCount }, () => template.previewImage),
    [slidesCount, template.previewImage]
  );

  const isShort = template.type.toLowerCase() === "short";

  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(initialVolume);

  useEffect(() => {
    if (!isOpen) return;
    setIsPlaying(true);
    setMuted(false);
    setVolume(initialVolume);
  }, [isOpen, initialVolume, template.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
              Cinematic Preview
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {template.name} · {isShort ? "short" : "long"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close cinematic preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-700">
            <TemplateMotionPlayer
              previewMode
              isPlaying={isPlaying}
              muted={muted}
              volume={volume}
              config={template.config}
              images={images}
              fallbackAudioUrl={template.defaultAudio}
              title={listingTitle}
              priceLine={priceLine}
              locationLine={locationLine}
              isShort={isShort}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {muted ? "Muted" : "Sound"}
              </button>
            </div>

            <div className="flex flex-1 items-center gap-3 sm:justify-end">
              <div className="flex w-full items-center gap-3 sm:w-[360px]">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    setMuted(v === 0);
                  }}
                  className="w-full accent-indigo-600"
                  aria-label="Preview volume"
                />
                <span className="w-12 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => onUseTemplate(template)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black active:bg-black/90 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:active:bg-white/90"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

