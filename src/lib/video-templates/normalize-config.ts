import type {
  TemplateMotionConfig,
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

/** Normalize DB / API JSON into a motion config the player understands. */
export function normalizeTemplateConfig(raw: unknown): TemplateMotionConfig {
  const base = asRecord(raw) ?? {};
  const slidesRaw = base.slides;
  let slides: TemplateSlideDef[] = [];

  if (Array.isArray(slidesRaw) && slidesRaw.length > 0) {
    slides = slidesRaw.map(parseSlideEntry).filter((s): s is TemplateSlideDef => Boolean(s));
  }
  if (slides.length === 0) {
    slides = buildLegacySlides(base);
  }

  const overlayRaw = asRecord(base.overlay);
  const transition = normalizeTransition(base.transition);

  const motion: TemplateMotionConfig = {
    slides,
    transition,
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
