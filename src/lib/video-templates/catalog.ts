import type { CatalogTemplate } from "./types";

const P1 =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1080&h=1920";
const P2 =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1080&h=1920";
const P3 =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1080&h=1920";
const W1 =
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1920&h=1080";
const W2 =
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=1920&h=1080";

/** 9 premium presets — synced to DB via prisma seed / upsert. */
export const VIDEO_TEMPLATE_CATALOG: CatalogTemplate[] = [
  {
    slug: "luxury-vertical-reveal",
    name: "Luxury Vertical Reveal",
    type: "SHORT",
    previewImage: P1,
    sortOrder: 1,
    config: {
      engineVersion: 1,
      slideDurationMs: 3200,
      transition: "luxury-blur-cut",
      kenBurns: true,
      grainOpacity: 0.04,
      theme: {
        overlay: "gradient-dark",
        titlePosition: "bottom",
        typography: "serif-elegant",
        accent: "amber",
      },
      defaultPlaceholders: [P1, P2, P3],
      showPriceBadge: true,
    },
  },
  {
    slug: "tiktok-premium-real-estate",
    name: "TikTok Premium Real Estate",
    type: "SHORT",
    previewImage: P2,
    sortOrder: 2,
    config: {
      engineVersion: 1,
      slideDurationMs: 2800,
      transition: "snap-zoom",
      kenBurns: false,
      theme: {
        overlay: "vignette-spotlight",
        titlePosition: "center",
        typography: "sans-bold",
        accent: "cyan",
      },
      defaultPlaceholders: [P2, P3, P1],
      showPriceBadge: true,
    },
  },
  {
    slug: "dark-gold-elite",
    name: "Dark Gold Elite",
    type: "SHORT",
    previewImage: P3,
    sortOrder: 3,
    config: {
      engineVersion: 1,
      slideDurationMs: 4000,
      transition: "gold-fade",
      kenBurns: true,
      theme: {
        overlay: "gold-frame",
        titlePosition: "bottom",
        typography: "display-gold",
        accent: "gold",
      },
      defaultPlaceholders: [P3, P1, P2],
      showPriceBadge: true,
    },
  },
  {
    slug: "neon-urban-short",
    name: "Neon Urban Pulse",
    type: "SHORT",
    previewImage: P1,
    sortOrder: 4,
    config: {
      engineVersion: 1,
      slideDurationMs: 2600,
      transition: "glitch-lite",
      kenBurns: true,
      theme: {
        overlay: "neon-edge",
        titlePosition: "top",
        typography: "sans-bold",
        accent: "fuchsia",
      },
      defaultPlaceholders: [P2, P1, P3],
      showPriceBadge: true,
    },
  },
  {
    slug: "cinematic-property-showcase",
    name: "Cinematic Property Showcase",
    type: "LONG",
    previewImage: W1,
    sortOrder: 10,
    config: {
      engineVersion: 1,
      slideDurationMs: 6500,
      transition: "cinematic-dissolve",
      kenBurns: true,
      grainOpacity: 0.06,
      theme: {
        overlay: "letterbox-film",
        titlePosition: "bottom",
        typography: "serif-elegant",
        accent: "slate",
      },
      defaultPlaceholders: [W1, W2, P1],
      showPriceBadge: true,
      audio: { loop: true, volume: 0.35 },
    },
  },
  {
    slug: "minimal-clean-architecture",
    name: "Minimal Clean Architecture",
    type: "LONG",
    previewImage: W2,
    sortOrder: 11,
    config: {
      engineVersion: 1,
      slideDurationMs: 5200,
      transition: "soft-fade",
      kenBurns: false,
      theme: {
        overlay: "white-minimal",
        titlePosition: "bottom",
        typography: "sans-bold",
        accent: "stone",
      },
      defaultPlaceholders: [W2, W1, P2],
      showPriceBadge: true,
    },
  },
  {
    slug: "luxury-agency-promo",
    name: "Luxury Agency Promo",
    type: "LONG",
    previewImage: W1,
    sortOrder: 12,
    config: {
      engineVersion: 1,
      slideDurationMs: 5500,
      transition: "elegant-slide",
      kenBurns: true,
      theme: {
        overlay: "brand-strip",
        titlePosition: "center",
        typography: "serif-elegant",
        accent: "gold",
      },
      defaultPlaceholders: [W1, W2, W1],
      showPriceBadge: true,
      showChannelBranding: true,
    },
  },
  {
    slug: "coastal-breeze-long",
    name: "Coastal Breeze Editorial",
    type: "LONG",
    previewImage: W2,
    sortOrder: 13,
    config: {
      engineVersion: 1,
      slideDurationMs: 5800,
      transition: "parallax-soft",
      kenBurns: true,
      theme: {
        overlay: "sky-gradient",
        titlePosition: "bottom",
        typography: "sans-bold",
        accent: "sky",
      },
      defaultPlaceholders: [W2, P3, W1],
      showPriceBadge: true,
    },
  },
  {
    slug: "penthouse-night-long",
    name: "Penthouse Night Luxe",
    type: "LONG",
    previewImage: P2,
    sortOrder: 14,
    config: {
      engineVersion: 1,
      slideDurationMs: 6200,
      transition: "slow-glow",
      kenBurns: true,
      grainOpacity: 0.05,
      theme: {
        overlay: "midnight-blue",
        titlePosition: "bottom",
        typography: "display-gold",
        accent: "amber",
      },
      defaultPlaceholders: [P2, W1, P3],
      showPriceBadge: true,
    },
  },
];
