export type TemplateSlideAnimation =
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "fade"
  | "blur";

export type TemplateTransitionKind = "fade" | "blur";

export type TemplateOverlayPosition = "top" | "center" | "bottom";

export type TemplateOverlayAnim = "fade-up" | "fade-down" | "scale-in";

export type TemplateSlideDef = {
  duration: number;
  animation: TemplateSlideAnimation;
};

export type TemplateOverlayBlock = {
  position: TemplateOverlayPosition;
  animation?: TemplateOverlayAnim;
};

/** Stored in Template.config (JSON). */
export type TemplateMotionConfig = {
  slides: TemplateSlideDef[];
  transition?: TemplateTransitionKind | string;
  overlay?: {
    title?: TemplateOverlayBlock;
    price?: TemplateOverlayBlock;
    location?: TemplateOverlayBlock;
  };
  theme?: {
    overlay?: string;
    titlePosition?: TemplateOverlayPosition;
    typography?: "sans-bold" | "serif-elegant" | "display-gold";
    accent?: string;
  };
  /** 0–1 film grain */
  grainOpacity?: number;
  showPriceBadge?: boolean;
  showChannelBranding?: boolean;
  defaultPlaceholders?: string[];
  audio?: { loop?: boolean; volume?: number };
  /** Legacy catalog fields (ignored if slides present) */
  engineVersion?: number;
  duration?: number;
  slideDurationMs?: number;
  animation?: string;
  textStyle?: string;
  kenBurns?: boolean;
  imageSlots?: number;
};

export type TemplateListItemDto = {
  id: string;
  name: string;
  type: string;
  previewImage: string;
  previewVideo: string | null;
  defaultAudio: string | null;
  config: unknown;
};
