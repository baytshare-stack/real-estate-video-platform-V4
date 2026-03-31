/**
 * Used by prisma/seed.ts only. IDs apply when templates are created fresh;
 * migrated DB rows are matched by name and updated in place.
 */
export type TemplateSeedRow = {
  id: string;
  name: string;
  type: "short" | "long";
  previewImage: string;
  previewVideo: string;
  defaultAudio: string;
  config: Record<string, unknown>;
};

const unsplash = (photoPath: string, w = 720, h = 1280) =>
  `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&q=80&w=${w}&h=${h}`;

const vid = (path: string) => `https://storage.googleapis.com/gtv-videos-bucket/sample/${path}`;
const sfx = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

function slidesShort(
  pattern: { duration: number; animation: string }[]
): Record<string, unknown> {
  return {
    slides: pattern,
    transition: "fade",
    overlay: {
      title: { position: "center", animation: "fade-up" },
      price: { position: "bottom", animation: "scale-in" },
      location: { position: "bottom", animation: "fade-up" },
    },
    theme: { overlay: "gradient-dark", typography: "sans-bold", accent: "amber" },
    showPriceBadge: true,
    showChannelBranding: false,
  };
}

function slidesLong(
  pattern: { duration: number; animation: string }[],
  theme: Record<string, string>
): Record<string, unknown> {
  return {
    slides: pattern,
    transition: "blur",
    overlay: {
      title: { position: "bottom", animation: "fade-up" },
      price: { position: "bottom", animation: "scale-in" },
      location: { position: "bottom", animation: "fade-up" },
    },
    theme: { overlay: "letterbox-film", typography: "serif-elegant", accent: "amber", ...theme },
    showPriceBadge: true,
    showChannelBranding: true,
    grainOpacity: 0.04,
  };
}

export const TEMPLATE_SEED_DATA: TemplateSeedRow[] = [
  {
    id: "tpl_seed_luxury_reveal",
    name: "Luxury Vertical Reveal",
    type: "short",
    previewImage: unsplash("photo-1600596542815-ffad4c1539a9"),
    previewVideo: vid("ForBiggerBlazes.mp4"),
    defaultAudio: sfx(1),
    config: slidesShort([
      { duration: 2.2, animation: "zoom-in" },
      { duration: 2, animation: "pan-right" },
      { duration: 2.1, animation: "zoom-out" },
      { duration: 2, animation: "pan-left" },
      { duration: 2.2, animation: "zoom-in" },
      { duration: 2.4, animation: "blur" },
    ]),
  },
  {
    id: "tpl_seed_tiktok_premium",
    name: "TikTok Premium Real Estate",
    type: "short",
    previewImage: unsplash("photo-1600585154340-be6161a56a0c"),
    previewVideo: vid("ForBiggerEscapes.mp4"),
    defaultAudio: sfx(2),
    config: slidesShort([
      { duration: 2, animation: "pan-left" },
      { duration: 2, animation: "zoom-in" },
      { duration: 2, animation: "pan-right" },
      { duration: 2, animation: "zoom-out" },
      { duration: 2.2, animation: "zoom-in" },
      { duration: 2.2, animation: "pan-left" },
    ]),
  },
  {
    id: "tpl_seed_dark_gold",
    name: "Dark Gold Elite",
    type: "short",
    previewImage: unsplash("photo-1613490493576-7fde63acd811"),
    previewVideo: vid("ForBiggerFun.mp4"),
    defaultAudio: sfx(3),
    config: {
      ...slidesShort([
        { duration: 2.5, animation: "zoom-in" },
        { duration: 2.3, animation: "zoom-out" },
        { duration: 2.4, animation: "pan-right" },
        { duration: 2.2, animation: "pan-left" },
        { duration: 2.6, animation: "zoom-in" },
      ]),
      transition: "blur",
      theme: { overlay: "gold-frame", typography: "display-gold", accent: "gold" },
    },
  },
  {
    id: "tpl_seed_skyline_flash",
    name: "Skyline Flash Short",
    type: "short",
    previewImage: unsplash("photo-1512917774080-9991f1c4c750"),
    previewVideo: vid("ForBiggerJoyrides.mp4"),
    defaultAudio: sfx(4),
    config: {
      ...slidesShort([
        { duration: 1.8, animation: "pan-right" },
        { duration: 1.9, animation: "zoom-in" },
        { duration: 1.8, animation: "blur" },
        { duration: 2, animation: "pan-left" },
        { duration: 1.9, animation: "zoom-out" },
        { duration: 2, animation: "zoom-in" },
      ]),
      theme: { overlay: "neon-edge", typography: "sans-bold", accent: "cyan" },
      overlay: {
        title: { position: "top", animation: "fade-down" },
        price: { position: "bottom", animation: "scale-in" },
        location: { position: "bottom", animation: "fade-up" },
      },
    },
  },
  {
    id: "tpl_seed_premium_swipe",
    name: "Premium Swipe Reels",
    type: "short",
    previewImage: unsplash("photo-1600607687939-ce8a6c25118c"),
    previewVideo: vid("ForBiggerMeltdowns.mp4"),
    defaultAudio: sfx(5),
    config: slidesShort([
      { duration: 2, animation: "zoom-out" },
      { duration: 2, animation: "pan-left" },
      { duration: 2, animation: "zoom-in" },
      { duration: 2, animation: "pan-right" },
      { duration: 2.1, animation: "blur" },
      { duration: 2.1, animation: "zoom-in" },
    ]),
  },
  {
    id: "tpl_seed_cinematic_long",
    name: "Cinematic Property Showcase",
    type: "long",
    previewImage: unsplash("photo-1600566753190-17f0baa2a6c3"),
    previewVideo: vid("WeAreGoingOnBullrun.mp4"),
    defaultAudio: sfx(6),
    config: slidesLong(
      [
        { duration: 4.5, animation: "zoom-in" },
        { duration: 4.2, animation: "pan-left" },
        { duration: 4.5, animation: "zoom-out" },
        { duration: 4.3, animation: "pan-right" },
        { duration: 4.6, animation: "zoom-in" },
        { duration: 4.4, animation: "pan-left" },
        { duration: 4.5, animation: "blur" },
        { duration: 4.8, animation: "zoom-out" },
      ],
      {}
    ),
  },
  {
    id: "tpl_seed_minimal_long",
    name: "Minimal Clean Architecture",
    type: "long",
    previewImage: unsplash("photo-1600585154526-990dced4db0d"),
    previewVideo: vid("VolvoXC40.mp4"),
    defaultAudio: sfx(7),
    config: {
      slides: [
        { duration: 4, animation: "fade" },
        { duration: 4, animation: "zoom-in" },
        { duration: 4, animation: "fade" },
        { duration: 4.2, animation: "pan-right" },
        { duration: 4, animation: "zoom-out" },
        { duration: 4.2, animation: "pan-left" },
        { duration: 4, animation: "fade" },
        { duration: 4.5, animation: "zoom-in" },
      ],
      transition: "fade",
      overlay: {
        title: { position: "top", animation: "fade-down" },
        price: { position: "top", animation: "scale-in" },
        location: { position: "bottom", animation: "fade-up" },
      },
      theme: { overlay: "white-minimal", typography: "sans-bold", accent: "slate" },
      showPriceBadge: true,
      showChannelBranding: false,
    },
  },
  {
    id: "tpl_seed_agency_promo",
    name: "Luxury Agency Promo",
    type: "long",
    previewImage: unsplash("photo-1600047509807-ba8f99d2cdde"),
    previewVideo: vid("ForBiggerBlazes.mp4"),
    defaultAudio: sfx(8),
    config: slidesLong(
      [
        { duration: 4.2, animation: "pan-right" },
        { duration: 4.4, animation: "zoom-in" },
        { duration: 4.3, animation: "pan-left" },
        { duration: 4.5, animation: "zoom-out" },
        { duration: 4.2, animation: "zoom-in" },
        { duration: 4.6, animation: "pan-right" },
        { duration: 4.4, animation: "blur" },
        { duration: 4.5, animation: "zoom-in" },
      ],
      { accent: "indigo", overlay: "brand-strip" }
    ),
  },
  {
    id: "tpl_seed_architectural_flow",
    name: "Architectural Flow",
    type: "long",
    previewImage: unsplash("photo-1600585154084-4e0feef3d575"),
    previewVideo: vid("SubaruOutbackOnStreetAndDirt.mp4"),
    defaultAudio: sfx(9),
    config: slidesLong(
      [
        { duration: 4.5, animation: "pan-left" },
        { duration: 4.3, animation: "zoom-in" },
        { duration: 4.6, animation: "pan-right" },
        { duration: 4.4, animation: "zoom-out" },
        { duration: 4.5, animation: "blur" },
        { duration: 4.7, animation: "zoom-in" },
        { duration: 4.3, animation: "pan-left" },
        { duration: 4.5, animation: "zoom-out" },
      ],
      { accent: "teal", overlay: "gradient-dark" }
    ),
  },
  {
    id: "tpl_seed_imperial_estate",
    name: "Imperial Estate Story",
    type: "long",
    previewImage: unsplash("photo-1600566753086-00f18fb6b3ea"),
    previewVideo: vid("Tesla.mp4"),
    defaultAudio: sfx(10),
    config: slidesLong(
      [
        { duration: 5, animation: "zoom-in" },
        { duration: 5, animation: "zoom-out" },
        { duration: 5.2, animation: "pan-right" },
        { duration: 5, animation: "pan-left" },
        { duration: 5.2, animation: "blur" },
        { duration: 5.4, animation: "zoom-in" },
        { duration: 5, animation: "pan-right" },
        { duration: 5.2, animation: "zoom-out" },
      ],
      { accent: "amber", overlay: "letterbox-film" }
    ),
  },
];
