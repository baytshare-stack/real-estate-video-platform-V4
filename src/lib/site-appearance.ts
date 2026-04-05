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

export type SiteUiHome = {
  videoGridColumns: HomeVideoColumns;
  heroBackground?: string;
  heroForeground?: string;
  gridBackground?: string;
  shortsBackground?: string;
  mapBackground?: string;
};

export type SiteUiConfig = {
  home: SiteUiHome;
  discover: {
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
    layout: ProfileLayout;
    showAccountCard: boolean;
    showMyVisits: boolean;
    showInbox: boolean;
  };
  videoCard: {
    layout: VideoCardLayout;
  };
};

export const DEFAULT_UI_CONFIG: SiteUiConfig = {
  home: {
    videoGridColumns: 4,
  },
  discover: {
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
    layout: "classic",
    showAccountCard: true,
    showMyVisits: true,
    showInbox: true,
  },
  videoCard: {
    layout: "standard",
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

export function parseUiConfig(raw: unknown): SiteUiConfig {
  const h0 = DEFAULT_UI_CONFIG.home;
  const d = DEFAULT_UI_CONFIG.discover;
  const p = DEFAULT_UI_CONFIG.profile;
  const v = DEFAULT_UI_CONFIG.videoCard;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      home: { ...h0 },
      discover: { ...d },
      profile: { ...p },
      videoCard: { ...v },
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

  return {
    home: {
      videoGridColumns,
      heroBackground: optCssColor(hm.heroBackground) ?? h0.heroBackground,
      heroForeground: optCssColor(hm.heroForeground) ?? h0.heroForeground,
      gridBackground: optCssColor(hm.gridBackground) ?? h0.gridBackground,
      shortsBackground: optCssColor(hm.shortsBackground) ?? h0.shortsBackground,
      mapBackground: optCssColor(hm.mapBackground) ?? h0.mapBackground,
    },
    discover: {
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
      layout: profileLayout,
      showAccountCard: typeof prof.showAccountCard === "boolean" ? prof.showAccountCard : p.showAccountCard,
      showMyVisits: typeof prof.showMyVisits === "boolean" ? prof.showMyVisits : p.showMyVisits,
      showInbox: typeof prof.showInbox === "boolean" ? prof.showInbox : p.showInbox,
    },
    videoCard: {
      layout: vidLayout,
    },
  };
}

export function dtoUiToJson(ui: SiteUiConfig): Record<string, unknown> {
  return {
    home: { ...ui.home },
    discover: { ...ui.discover },
    profile: { ...ui.profile },
    videoCard: { ...ui.videoCard },
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
