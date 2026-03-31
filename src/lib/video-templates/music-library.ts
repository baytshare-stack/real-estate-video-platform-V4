export type MusicLibraryTrack = {
  id: string;
  title: string;
  mood: string;
  url: string;
};

const sfx = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

export const TEMPLATE_MUSIC_LIBRARY: MusicLibraryTrack[] = [
  { id: "luxury-1", title: "Luxury Pulse", mood: "Cinematic", url: sfx(1) },
  { id: "urban-2", title: "Urban Skyline", mood: "Modern", url: sfx(2) },
  { id: "elegant-3", title: "Elegant Keys", mood: "Premium", url: sfx(3) },
  { id: "reels-4", title: "Fast Reels Beat", mood: "Energetic", url: sfx(4) },
  { id: "gold-5", title: "Golden Estate", mood: "Luxury", url: sfx(5) },
  { id: "drone-6", title: "Drone Journey", mood: "Aerial", url: sfx(6) },
  { id: "ambient-7", title: "Ambient Home", mood: "Relaxed", url: sfx(7) },
  { id: "clean-8", title: "Minimal Flow", mood: "Clean", url: sfx(8) },
  { id: "agent-9", title: "Agent Spotlight", mood: "Promo", url: sfx(9) },
  { id: "imperial-10", title: "Imperial Story", mood: "Epic", url: sfx(10) },
];

