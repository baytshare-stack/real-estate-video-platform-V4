import type { VideoTemplateType } from "@prisma/client";

export type TemplateThemeConfig = {
  overlay?: string;
  titlePosition?: "top" | "center" | "bottom";
  accent?: string;
  typography?: "sans-bold" | "serif-elegant" | "display-gold";
};

/** Stored in VideoTemplate.config (JSON). Consumed by TemplateSlideshow. */
export type TemplateEngineConfig = {
  engineVersion?: number;
  duration?: number;
  slideDurationMs?: number;
  transition?: string;
  animation?: "scale-in" | "scale-out" | "fade" | "blur" | "slide-left" | "slide-right";
  textStyle?: "bold-center" | "minimal" | "luxury";
  kenBurns?: boolean;
  grainOpacity?: number;
  overlay?: {
    titlePosition?: "top" | "center" | "bottom";
    pricePosition?: "top" | "center" | "bottom";
    locationPosition?: "top" | "center" | "bottom";
  };
  theme?: TemplateThemeConfig;
  audio?: { loop?: boolean; volume?: number };
  /** Fallback images when listing has none */
  defaultPlaceholders?: string[];
  showPriceBadge?: boolean;
  showChannelBranding?: boolean;
  imageSlots?: number;
};

export type TemplatePayload = {
  images?: string[];
  audioUrl?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  contactEmail?: string | null;
};

export type CatalogTemplate = {
  slug: string;
  name: string;
  type: VideoTemplateType;
  previewImage: string | null;
  sortOrder: number;
  config: TemplateEngineConfig;
};
