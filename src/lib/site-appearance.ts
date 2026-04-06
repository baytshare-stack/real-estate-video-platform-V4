import { unstable_cache } from "next/cache";
import type { SiteAppearance } from "@prisma/client";
import prisma from "@/lib/prisma";

export const SITE_APPEARANCE_ID = "site";

export const FONT_PRESETS: Record<
  string,
  { label: string; googleFamily: string; stack: string }
> = {
  inter: { label: "Inter", googleFamily: "Inter", stack: "Inter, system-ui, sans-serif" },
  dm_sans: {
    label: "DM Sans",
    googleFamily: "DM Sans",
    stack: '"DM Sans", system-ui, sans-serif',
  },
  outfit: {
    label: "Outfit",
    googleFamily: "Outfit",
    stack: '"Outfit", system-ui, sans-serif',
  },
  plus_jakarta: {
    label: "Plus Jakarta Sans",
    googleFamily: "Plus Jakarta Sans",
    stack: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  manrope: {
    label: "Manrope",
    googleFamily: "Manrope",
    stack: "Manrope, system-ui, sans-serif",
  },
  space_grotesk: {
    label: "Space Grotesk",
    googleFamily: "Space Grotesk",
    stack: '"Space Grotesk", system-ui, sans-serif',
  },
};

export const SIDEBAR_DESKTOP_KEYS = [
  "home",
  "shorts",
  "subscribers",
  "subscriptions",
  "explore",
  "agents",
  "agencies",
  "trending",
] as const;

export const SIDEBAR_MOBILE_KEYS = ["home", "shorts", "explore", "agents", "agencies", "studio"] as const;

export const HEADER_RIGHT_KEYS = ["mobile_search", "upload", "language", "user"] as const;

export const HOME_SECTION_KEYS = [
  "hero_filters",
  "grid_top",
  "shorts",
  "grid_rest",
  "map",
] as const;

export type SidebarDesktopKey = (typeof SIDEBAR_DESKTOP_KEYS)[number];
export type SidebarMobileKey = (typeof SIDEBAR_MOBILE_KEYS)[number];
export type HeaderRightKey = (typeof HEADER_RIGHT_KEYS)[number];
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

export type SiteLayoutConfig = {
  sidebarDesktop: string[];
  sidebarMobile: string[];
  headerRight: string[];
  homeSections: string[];
};

export const DEFAULT_LAYOUT: SiteLayoutConfig = {
  sidebarDesktop: [...SIDEBAR_DESKTOP_KEYS],
  sidebarMobile: [...SIDEBAR_MOBILE_KEYS],
  headerRight: [...HEADER_RIGHT_KEYS],
  homeSections: [...HOME_SECTION_KEYS],
};

function normalizeOrder(preferred: unknown, allowed: readonly string[], fallback: readonly string[]): string[] {
  const raw = Array.isArray(preferred) ? preferred.filter((x): x is string => typeof x === "string") : [];
  const allowedSet = new Set(allowed);
  const out: string[] = [];
  for (const k of raw) {
    if (allowedSet.has(k) && !out.includes(k)) out.push(k);
  }
  for (const k of fallback) {
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

export function parseLayoutJson(raw: unknown): SiteLayoutConfig {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    sidebarDesktop: normalizeOrder(o.sidebarDesktop, SIDEBAR_DESKTOP_KEYS, SIDEBAR_DESKTOP_KEYS),
    sidebarMobile: normalizeOrder(o.sidebarMobile, SIDEBAR_MOBILE_KEYS, SIDEBAR_MOBILE_KEYS),
    headerRight: normalizeOrder(o.headerRight, HEADER_RIGHT_KEYS, HEADER_RIGHT_KEYS),
    homeSections: normalizeOrder(o.homeSections, HOME_SECTION_KEYS, HOME_SECTION_KEYS),
  };
}

export type DiscoverCardStyle = "immersive" | "compact" | "minimal";
export type DiscoverGap = "tight" | "normal" | "wide";
export type DiscoverColumns = 2 | 3 | 4;
export type ProfileLayout = "classic" | "spotlight";
export type VideoCardLayout = "standard" | "dense" | "poster";
export type HomeVideoColumns = 2 | 3 | 4;
export type HomeThemeKey = "metropolitan" | "noir" | "aurora" | "desert" | "minimal";
export type DiscoverThemeKey = "studio" | "glass" | "magazine" | "executive" | "neo";
export type ProfileThemeKey = "executive" | "creator" | "minimal" | "luxury" | "neon";
export type UserThemeKey = "clean" | "corporate" | "charcoal" | "sunset" | "mono";
export type VideoThemeKey = "cinema" | "editorial" | "modern" | "premium" | "stream";

export type SiteUiHome = {
  videoGridColumns: HomeVideoColumns;
  theme: HomeThemeKey;
  heroBackground?: string;
  heroForeground?: string;
  gridBackground?: string;
  shortsBackground?: string;
  mapBackground?: string;
};

export type SiteUiConfig = {
  home: SiteUiHome;
  discover: {
    theme: DiscoverThemeKey;
    pageBackground?: string;
    cardAccent?: string;
    agentsColumns: DiscoverColumns;
    agenciesColumns: DiscoverColumns;
    gap: DiscoverGap;
    agentCardStyle: DiscoverCardStyle;
    agencyCardStyle: DiscoverCardStyle;
    showFilters: boolean;
    showPagination: boolean;
    showResultsFooter: boolean;
    showListDebug: boolean;
  };
  profile: {
    theme: ProfileThemeKey;
    panelBackground?: string;
    accent?: string;
    layout: ProfileLayout;
    showAccountCard: boolean;
    showMyVisits: boolean;
    showInbox: boolean;
  };
  videoCard: {
    layout: VideoCardLayout;
    theme: VideoThemeKey;
    cardTint?: string;
  };
  user: {
    theme: UserThemeKey;
    pageBackground?: string;
  };
};

export const DEFAULT_UI_CONFIG: SiteUiConfig = {
  home: {
    videoGridColumns: 4,
    theme: "metropolitan",
  },
  discover: {
    theme: "studio",
    pageBackground: undefined,
    cardAccent: undefined,
    agentsColumns: 3,
    agenciesColumns: 3,
    gap: "normal",
    agentCardStyle: "immersive",
    agencyCardStyle: "immersive",
    showFilters: true,
    showPagination: true,
    showResultsFooter: true,
    showListDebug: true,
  },
  profile: {
    theme: "executive",
    panelBackground: undefined,
    accent: undefined,
    layout: "classic",
    showAccountCard: true,
    showMyVisits: true,
    showInbox: true,
  },
  videoCard: {
    layout: "standard",
    theme: "cinema",
    cardTint: undefined,
  },
  user: {
    theme: "clean",
    pageBackground: undefined,
  },
};

function col3(n: unknown, fallback: DiscoverColumns): DiscoverColumns {
  return n === 2 || n === 3 || n === 4 ? n : fallback;
}

function optCssColor(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  if (s.startsWith("#") || s.toLowerCase().startsWith("rgb") || s.toLowerCase().startsWith("hsl")) {
    return s.slice(0, 80);
  }
  return undefined;
}

export function homeVideoGridClass(cols: HomeVideoColumns): string {
  const base = "grid grid-cols-1 gap-x-4 gap-y-8";
  if (cols === 2) return `${base} sm:grid-cols-2`;
  if (cols === 3) return `${base} sm:grid-cols-2 lg:grid-cols-3`;
  return `${base} sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`;
}

export const HOME_THEME_PRESETS: { key: HomeThemeKey; label: string; note: string }[] = [
  { key: "metropolitan", label: "Metropolitan", note: "Bold clean marketplace feel." },
  { key: "noir", label: "Noir Luxe", note: "Dark cinematic premium look." },
  { key: "aurora", label: "Aurora Glass", note: "Soft gradient + glass tone." },
  { key: "desert", label: "Desert Warm", note: "Warm luxury hospitality look." },
  { key: "minimal", label: "Minimal White", note: "Crisp editorial product style." },
];

export const DISCOVER_THEME_PRESETS: { key: DiscoverThemeKey; label: string; note: string }[] = [
  { key: "studio", label: "Studio", note: "Balanced modern cards." },
  { key: "glass", label: "Glass", note: "Glassmorphism panels and blur." },
  { key: "magazine", label: "Magazine", note: "Editorial blocks and spacing." },
  { key: "executive", label: "Executive", note: "Corporate polished directory." },
  { key: "neo", label: "Neo", note: "High-contrast modern gradients." },
];

export const PROFILE_THEME_PRESETS: { key: ProfileThemeKey; label: string; note: string }[] = [
  { key: "executive", label: "Executive", note: "Professional business profile." },
  { key: "creator", label: "Creator", note: "Content-first with highlights." },
  { key: "minimal", label: "Minimal", note: "Lightweight clean profile." },
  { key: "luxury", label: "Luxury", note: "Premium dark gold accents." },
  { key: "neon", label: "Neon", note: "Modern night UI with glow." },
];

export const USER_THEME_PRESETS: { key: UserThemeKey; label: string; note: string }[] = [
  { key: "clean", label: "Clean", note: "Neutral default user page style." },
  { key: "corporate", label: "Corporate", note: "Sharp enterprise visual language." },
  { key: "charcoal", label: "Charcoal", note: "Dark monochrome comfort." },
  { key: "sunset", label: "Sunset", note: "Warm accent experience." },
  { key: "mono", label: "Mono", note: "Strict black-and-white modern." },
];

export const VIDEO_THEME_PRESETS: { key: VideoThemeKey; label: string; note: string }[] = [
  { key: "cinema", label: "Cinema", note: "Movie-like card emphasis." },
  { key: "editorial", label: "Editorial", note: "Magazine title-forward cards." },
  { key: "modern", label: "Modern", note: "Current platform neutral." },
  { key: "premium", label: "Premium", note: "Luxury presentation style." },
  { key: "stream", label: "Stream", note: "Streaming-centric compact visuals." },
];

export function homeThemeClass(key: HomeThemeKey): string {
  switch (key) {
    case "noir":
      return "bg-gradient-to-b from-black/70 to-slate-950/70 border border-white/10 rounded-2xl p-3";
    case "aurora":
      return "bg-gradient-to-br from-cyan-900/30 via-indigo-900/20 to-violet-900/30 border border-cyan-400/20 rounded-2xl p-3";
    case "desert":
      return "bg-gradient-to-br from-amber-900/20 via-orange-900/15 to-zinc-900/40 border border-amber-300/20 rounded-2xl p-3";
    case "minimal":
      return "bg-white/[0.03] border border-white/10 rounded-2xl p-3";
    default:
      return "bg-slate-900/35 border border-white/10 rounded-2xl p-3";
  }
}

export function discoverThemeClass(key: DiscoverThemeKey): string {
  switch (key) {
    case "glass":
      return "rounded-2xl border border-cyan-300/25 bg-cyan-900/10 backdrop-blur-sm p-3";
    case "magazine":
      return "rounded-2xl border border-rose-300/20 bg-rose-900/10 p-3";
    case "executive":
      return "rounded-2xl border border-emerald-300/20 bg-emerald-900/10 p-3";
    case "neo":
      return "rounded-2xl border border-indigo-300/25 bg-indigo-900/15 p-3";
    default:
      return "rounded-2xl border border-white/10 bg-white/[0.02] p-3";
  }
}

export function profileThemeClass(key: ProfileThemeKey): string {
  switch (key) {
    case "creator":
      return "border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-900/25 to-slate-900";
    case "minimal":
      return "border-slate-600 bg-slate-900/70";
    case "luxury":
      return "border-amber-300/30 bg-gradient-to-br from-amber-900/25 via-zinc-900 to-black";
    case "neon":
      return "border-cyan-400/30 bg-gradient-to-br from-cyan-900/25 to-indigo-950";
    default:
      return "border-gray-800 bg-gray-900";
  }
}

export function parseUiConfig(raw: unknown): SiteUiConfig {
  const h0 = DEFAULT_UI_CONFIG.home;
  const d = DEFAULT_UI_CONFIG.discover;
  const p = DEFAULT_UI_CONFIG.profile;
  const v = DEFAULT_UI_CONFIG.videoCard;
  const u = DEFAULT_UI_CONFIG.user;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      home: { ...h0 },
      discover: { ...d },
      profile: { ...p },
      videoCard: { ...v },
      user: { ...u },
    };
  }
  const o = raw as Record<string, unknown>;
  const hm =
    o.home && typeof o.home === "object" && !Array.isArray(o.home)
      ? (o.home as Record<string, unknown>)
      : {};
  const videoGridColumns: HomeVideoColumns =
    hm.videoGridColumns === 2 || hm.videoGridColumns === 3 ? hm.videoGridColumns : 4;
  const disc =
    o.discover && typeof o.discover === "object" && !Array.isArray(o.discover)
      ? (o.discover as Record<string, unknown>)
      : {};
  const prof =
    o.profile && typeof o.profile === "object" && !Array.isArray(o.profile)
      ? (o.profile as Record<string, unknown>)
      : {};
  const vc =
    o.videoCard && typeof o.videoCard === "object" && !Array.isArray(o.videoCard)
      ? (o.videoCard as Record<string, unknown>)
      : {};
  const usr =
    o.user && typeof o.user === "object" && !Array.isArray(o.user)
      ? (o.user as Record<string, unknown>)
      : {};

  const gap: DiscoverGap =
    disc.gap === "tight" || disc.gap === "wide" ? disc.gap : d.gap;
  const agentStyle: DiscoverCardStyle =
    disc.agentCardStyle === "compact" || disc.agentCardStyle === "minimal"
      ? disc.agentCardStyle
      : "immersive";
  const agencyStyle: DiscoverCardStyle =
    disc.agencyCardStyle === "compact" || disc.agencyCardStyle === "minimal"
      ? disc.agencyCardStyle
      : "immersive";
  const profileLayout: ProfileLayout = prof.layout === "spotlight" ? "spotlight" : "classic";
  const vidLayout: VideoCardLayout =
    vc.layout === "dense" || vc.layout === "poster" ? vc.layout : "standard";
  const homeTheme: HomeThemeKey =
    hm.theme === "noir" || hm.theme === "aurora" || hm.theme === "desert" || hm.theme === "minimal"
      ? hm.theme
      : "metropolitan";
  const discoverTheme: DiscoverThemeKey =
    disc.theme === "glass" ||
    disc.theme === "magazine" ||
    disc.theme === "executive" ||
    disc.theme === "neo"
      ? disc.theme
      : "studio";
  const profileTheme: ProfileThemeKey =
    prof.theme === "creator" || prof.theme === "minimal" || prof.theme === "luxury" || prof.theme === "neon"
      ? prof.theme
      : "executive";
  const videoTheme: VideoThemeKey =
    vc.theme === "editorial" || vc.theme === "modern" || vc.theme === "premium" || vc.theme === "stream"
      ? vc.theme
      : "cinema";
  const userTheme: UserThemeKey =
    usr.theme === "corporate" || usr.theme === "charcoal" || usr.theme === "sunset" || usr.theme === "mono"
      ? usr.theme
      : "clean";

  return {
    home: {
      videoGridColumns,
      theme: homeTheme,
      heroBackground: optCssColor(hm.heroBackground) ?? h0.heroBackground,
      heroForeground: optCssColor(hm.heroForeground) ?? h0.heroForeground,
      gridBackground: optCssColor(hm.gridBackground) ?? h0.gridBackground,
      shortsBackground: optCssColor(hm.shortsBackground) ?? h0.shortsBackground,
      mapBackground: optCssColor(hm.mapBackground) ?? h0.mapBackground,
    },
    discover: {
      theme: discoverTheme,
      pageBackground: optCssColor(disc.pageBackground) ?? d.pageBackground,
      cardAccent: optCssColor(disc.cardAccent) ?? d.cardAccent,
      agentsColumns: col3(disc.agentsColumns, d.agentsColumns),
      agenciesColumns: col3(disc.agenciesColumns, d.agenciesColumns),
      gap,
      agentCardStyle: agentStyle,
      agencyCardStyle: agencyStyle,
      showFilters: typeof disc.showFilters === "boolean" ? disc.showFilters : d.showFilters,
      showPagination: typeof disc.showPagination === "boolean" ? disc.showPagination : d.showPagination,
      showResultsFooter:
        typeof disc.showResultsFooter === "boolean" ? disc.showResultsFooter : d.showResultsFooter,
      showListDebug: typeof disc.showListDebug === "boolean" ? disc.showListDebug : d.showListDebug,
    },
    profile: {
      theme: profileTheme,
      panelBackground: optCssColor(prof.panelBackground) ?? p.panelBackground,
      accent: optCssColor(prof.accent) ?? p.accent,
      layout: profileLayout,
      showAccountCard: typeof prof.showAccountCard === "boolean" ? prof.showAccountCard : p.showAccountCard,
      showMyVisits: typeof prof.showMyVisits === "boolean" ? prof.showMyVisits : p.showMyVisits,
      showInbox: typeof prof.showInbox === "boolean" ? prof.showInbox : p.showInbox,
    },
    videoCard: {
      layout: vidLayout,
      theme: videoTheme,
      cardTint: optCssColor(vc.cardTint) ?? v.cardTint,
    },
    user: {
      theme: userTheme,
      pageBackground: optCssColor(usr.pageBackground) ?? u.pageBackground,
    },
  };
}

export function dtoUiToJson(ui: SiteUiConfig): Record<string, unknown> {
  return {
    home: { ...ui.home },
    discover: { ...ui.discover },
    profile: { ...ui.profile },
    videoCard: { ...ui.videoCard },
    user: { ...ui.user },
  };
}

/** Tailwind grid classes for agents / agencies listing */
export function discoverGridUlClass(which: "agents" | "agencies", disc: SiteUiConfig["discover"]): string {
  const cols = which === "agents" ? disc.agentsColumns : disc.agenciesColumns;
  const gap = disc.gap === "tight" ? "gap-3" : disc.gap === "wide" ? "gap-8" : "gap-5";
  const grid =
    cols === 2
      ? "grid grid-cols-1 sm:grid-cols-2"
      : cols === 4
        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
  return `${grid} ${gap}`;
}

export type SiteAppearanceDTO = {
  primaryHex: string;
  accentHex: string;
  backgroundHex: string;
  surfaceHex: string;
  textHex: string;
  mutedHex: string;
  borderHex: string;
  fontBodyKey: string;
  fontHeadingKey: string;
  baseFontPx: number;
  headingScale: number;
  logoUrl: string | null;
  layout: SiteLayoutConfig;
  ui: SiteUiConfig;
};

export const DEFAULT_SITE_APPEARANCE: SiteAppearanceDTO = {
  primaryHex: "#3b82f6",
  accentHex: "#6366f1",
  backgroundHex: "#0f0f0f",
  surfaceHex: "#121212",
  textHex: "#f1f1f1",
  mutedHex: "#a1a1aa",
  borderHex: "rgba(255,255,255,0.1)",
  fontBodyKey: "inter",
  fontHeadingKey: "inter",
  baseFontPx: 16,
  headingScale: 1.06,
  logoUrl: null,
  layout: DEFAULT_LAYOUT,
  ui: {
    home: { ...DEFAULT_UI_CONFIG.home },
    discover: { ...DEFAULT_UI_CONFIG.discover },
    profile: { ...DEFAULT_UI_CONFIG.profile },
    videoCard: { ...DEFAULT_UI_CONFIG.videoCard },
    user: { ...DEFAULT_UI_CONFIG.user },
  },
};

function fontStack(key: string): string {
  return FONT_PRESETS[key]?.stack ?? FONT_PRESETS.inter!.stack;
}

export function rowToDTO(row: SiteAppearance): SiteAppearanceDTO {
  return {
    primaryHex: row.primaryHex,
    accentHex: row.accentHex,
    backgroundHex: row.backgroundHex,
    surfaceHex: row.surfaceHex,
    textHex: row.textHex,
    mutedHex: row.mutedHex,
    borderHex: row.borderHex,
    fontBodyKey: row.fontBodyKey,
    fontHeadingKey: row.fontHeadingKey,
    baseFontPx: row.baseFontPx,
    headingScale: row.headingScale,
    logoUrl: row.logoUrl,
    layout: parseLayoutJson(row.layoutJson),
    ui: parseUiConfig((row as { uiConfigJson?: unknown }).uiConfigJson),
  };
}

export function dtoToLayoutJson(layout: SiteLayoutConfig) {
  return {
    sidebarDesktop: layout.sidebarDesktop,
    sidebarMobile: layout.sidebarMobile,
    headerRight: layout.headerRight,
    homeSections: layout.homeSections,
  };
}

async function loadSiteAppearanceRow(): Promise<SiteAppearance | null> {
  try {
    return await prisma.siteAppearance.findUnique({ where: { id: SITE_APPEARANCE_ID } });
  } catch {
    return null;
  }
}

export async function getSiteAppearanceUncached(): Promise<SiteAppearanceDTO> {
  const row = await loadSiteAppearanceRow();
  if (!row) return DEFAULT_SITE_APPEARANCE;
  return rowToDTO(row);
}

export const getSiteAppearance = unstable_cache(
  async () => getSiteAppearanceUncached(),
  ["site-appearance-v1"],
  { tags: ["site-appearance"], revalidate: 120 }
);

export function appearanceToCssVars(dto: SiteAppearanceDTO): Record<string, string> {
  const bodyFont = fontStack(dto.fontBodyKey);
  const headFont = fontStack(dto.fontHeadingKey);
  return {
    "--site-primary": dto.primaryHex,
    "--site-accent": dto.accentHex,
    "--site-bg": dto.backgroundHex,
    "--site-surface": dto.surfaceHex,
    "--site-text": dto.textHex,
    "--site-muted": dto.mutedHex,
    "--site-border": dto.borderHex,
    "--site-font-body": bodyFont,
    "--site-font-heading": headFont,
    "--site-font-size-base": `${dto.baseFontPx}px`,
    "--site-heading-scale": String(dto.headingScale),
  };
}

export function googleFontHref(keys: string[]): string | null {
  const uniq = [...new Set(keys.map((k) => FONT_PRESETS[k]?.googleFamily).filter(Boolean))] as string[];
  if (uniq.length === 0) return null;
  const q = uniq.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}
