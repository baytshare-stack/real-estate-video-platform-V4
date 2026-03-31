import type {
  TemplateFontConfig,
  TemplateMotionConfig,
  TemplateSceneDef,
  TemplateSceneTextLayer,
  TemplateSlideAnimation,
  TemplateSlideDef,
} from "./types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function mapLegacyAnimation(anim?: string, kenBurns?: boolean): TemplateSlideAnimation {
  if (kenBurns) return "zoom-in";
  switch (anim) {
    case "scale-in":
    case "scale-out":
      return "zoom-in";
    case "slide-left":
      return "pan-left";
    case "slide-right":
      return "pan-right";
    case "blur":
      return "blur";
    case "fade":
      return "fade";
    default:
      return "zoom-in";
  }
}

function buildLegacySlides(raw: Record<string, unknown>): TemplateSlideDef[] {
  const slots = typeof raw.imageSlots === "number" && raw.imageSlots > 0 ? Math.min(raw.imageSlots, 12) : 6;
  const ms =
    typeof raw.slideDurationMs === "number" && raw.slideDurationMs > 0 ? raw.slideDurationMs : 3200;
  const dur = Math.round((ms / 1000) * 10) / 10;
  const anim = mapLegacyAnimation(
    typeof raw.animation === "string" ? raw.animation : undefined,
    Boolean(raw.kenBurns)
  );
  return Array.from({ length: slots }, (_, i) => ({
    duration: dur,
    animation: i % 3 === 1 && anim === "zoom-in" ? "pan-right" : anim,
  }));
}

function normalizeTransition(t: unknown): "fade" | "blur" {
  const s = typeof t === "string" ? t.toLowerCase() : "";
  if (s.includes("blur")) return "blur";
  return "fade";
}

function parseSlideEntry(entry: unknown): TemplateSlideDef | null {
  const o = asRecord(entry);
  if (!o) return null;
  const duration = typeof o.duration === "number" && o.duration > 0 ? o.duration : 2;
  const a = typeof o.animation === "string" ? o.animation : "zoom-in";
  const allowed: TemplateSlideAnimation[] = [
    "zoom-in",
    "zoom-out",
    "pan-left",
    "pan-right",
    "fade",
    "blur",
  ];
  const animation = (allowed.includes(a as TemplateSlideAnimation)
    ? a
    : "zoom-in") as TemplateSlideAnimation;
  return { duration, animation };
}

function parseSceneTextLayer(entry: unknown): TemplateSceneTextLayer | null {
  const o = asRecord(entry);
  if (!o) return null;
  if (typeof o.text !== "string" || !o.text.trim()) return null;
  const animation =
    o.animation === "fade-in" || o.animation === "slide-up" || o.animation === "zoom-in"
      ? o.animation
      : undefined;
  const position =
    o.position === "top" || o.position === "center" || o.position === "bottom"
      ? o.position
      : undefined;
  return {
    text: o.text.trim(),
    animation,
    position,
  };
}

function parseSceneEntry(entry: unknown): TemplateSceneDef | null {
  const o = asRecord(entry);
  if (!o) return null;
  const duration = typeof o.duration === "number" && o.duration > 0 ? o.duration : 2;
  const transition = o.transition === "blur" || o.transition === "fade" ? o.transition : undefined;
  const textLayers = Array.isArray(o.textLayers)
    ? o.textLayers.map(parseSceneTextLayer).filter((x): x is TemplateSceneTextLayer => Boolean(x))
    : typeof o.text === "string" && o.text.trim()
      ? [
          {
            text: o.text.trim(),
            animation: (
              o.animation === "fade-in" || o.animation === "slide-up" || o.animation === "zoom-in"
                ? o.animation
                : "fade-in"
            ) as "fade-in" | "slide-up" | "zoom-in",
            position: (
              o.position === "top" || o.position === "center" || o.position === "bottom"
                ? o.position
                : "center"
            ) as "top" | "center" | "bottom",
          },
        ]
      : [];
  return {
    duration,
    image: typeof o.image === "string" && o.image.trim() ? o.image.trim() : undefined,
    video: typeof o.video === "string" && o.video.trim() ? o.video.trim() : undefined,
    transition,
    textLayers,
  };
}

function parseFont(raw: unknown): TemplateFontConfig | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const family =
    o.family === "Cairo" ||
    o.family === "Tajawal" ||
    o.family === "Almarai" ||
    o.family === "Poppins" ||
    o.family === "Inter" ||
    o.family === "Montserrat"
      ? o.family
      : undefined;
  const size = typeof o.size === "number" && o.size > 0 ? o.size : undefined;
  const color = typeof o.color === "string" && o.color.trim() ? o.color.trim() : undefined;
  const weight =
    o.weight === "normal" ||
    o.weight === "medium" ||
    o.weight === "semibold" ||
    o.weight === "bold" ||
    o.weight === "800" ||
    o.weight === "900"
      ? o.weight
      : undefined;
  const align = o.align === "left" || o.align === "center" || o.align === "right" ? o.align : undefined;
  if (!family && !size && !color && !weight && !align) return undefined;
  return { family, size, color, weight, align };
}

/** Normalize DB / API JSON into a motion config the player understands. */
export function normalizeTemplateConfig(raw: unknown): TemplateMotionConfig {
  const base = asRecord(raw) ?? {};
  const slidesRaw = base.slides;
  const scenesRaw = base.scenes;
  let slides: TemplateSlideDef[] = [];
  let scenes: TemplateSceneDef[] = [];

  if (Array.isArray(slidesRaw) && slidesRaw.length > 0) {
    slides = slidesRaw.map(parseSlideEntry).filter((s): s is TemplateSlideDef => Boolean(s));
  }
  if (Array.isArray(scenesRaw) && scenesRaw.length > 0) {
    scenes = scenesRaw.map(parseSceneEntry).filter((s): s is TemplateSceneDef => Boolean(s));
    if (scenes.length && slides.length === 0) {
      slides = scenes.map((scene, idx) => ({
        duration: scene.duration,
        animation: idx % 2 === 0 ? "zoom-in" : "pan-left",
      }));
    }
  }
  if (slides.length === 0) {
    slides = buildLegacySlides(base);
  }

  const overlayRaw = asRecord(base.overlay);
  const transition = normalizeTransition(base.transition);

  const motion: TemplateMotionConfig = {
    slides,
    scenes,
    transition,
    font: parseFont(base.font),
    theme: asRecord(base.theme) as TemplateMotionConfig["theme"],
    grainOpacity: typeof base.grainOpacity === "number" ? base.grainOpacity : undefined,
    showPriceBadge: base.showPriceBadge !== false,
    showChannelBranding: Boolean(base.showChannelBranding),
    defaultPlaceholders: Array.isArray(base.defaultPlaceholders)
      ? base.defaultPlaceholders.filter((u): u is string => typeof u === "string")
      : undefined,
    audio:
      asRecord(base.audio) && typeof base.audio === "object"
        ? {
            loop: Boolean((base.audio as { loop?: boolean }).loop),
            volume: typeof (base.audio as { volume?: number }).volume === "number"
              ? (base.audio as { volume?: number }).volume
              : undefined,
          }
        : { loop: true, volume: 0.32 },
  };

  if (overlayRaw) {
    motion.overlay = {};
    for (const key of ["title", "price", "location"] as const) {
      const block = asRecord(overlayRaw[key]);
      if (!block) continue;
      const position =
        block.position === "top" || block.position === "center" || block.position === "bottom"
          ? block.position
          : "bottom";
      const animation =
        block.animation === "fade-up" ||
        block.animation === "fade-down" ||
        block.animation === "scale-in"
          ? block.animation
          : undefined;
      motion.overlay[key] = { position, animation };
    }
  }

  return motion;
}
