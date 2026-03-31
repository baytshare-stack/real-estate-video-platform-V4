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
export type TemplateSceneTextAnimation = "fade-in" | "slide-up" | "zoom-in";
export type TemplateSceneTextPosition = "top" | "center" | "bottom";
export type TemplateTextAlign = "left" | "center" | "right";

export type TemplateFontConfig = {
  family?: "Cairo" | "Tajawal" | "Almarai" | "Poppins" | "Inter" | "Montserrat";
  size?: number;
  color?: string;
  weight?: "normal" | "medium" | "semibold" | "bold" | "800" | "900";
  align?: TemplateTextAlign;
};

export type TemplateSceneTextLayer = {
  text: string;
  animation?: TemplateSceneTextAnimation;
  position?: TemplateSceneTextPosition;
};

export type TemplateSceneDef = {
  duration: number;
  image?: string;
  video?: string;
  transition?: TemplateTransitionKind;
  textLayers?: TemplateSceneTextLayer[];
};

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
  scenes?: TemplateSceneDef[];
  transition?: TemplateTransitionKind | string;
  font?: TemplateFontConfig;
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
