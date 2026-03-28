"use client";

import * as React from "react";

type Ctx = {
  activeVideoId: string | null;
  reportVisibility: (videoId: string, ratio: number, intersecting: boolean) => void;
};

const ShortsPlaybackContext = React.createContext<Ctx | null>(null);

const MIN_RATIO = 0.7;

/**
 * Ensures only one Short in the feed is "active" for autoplay: the visible clip
 * with the highest intersection ratio above MIN_RATIO wins (TikTok-style).
 */
export function ShortsPlaybackProvider({ children }: { children: React.ReactNode }) {
  const [activeVideoId, setActiveVideoId] = React.useState<string | null>(null);
  const scoresRef = React.useRef<Map<string, number>>(new Map());
  const rafRef = React.useRef<number | null>(null);

  const flush = React.useCallback(() => {
    let best: string | null = null;
    let bestR = 0;
    for (const [id, r] of scoresRef.current) {
      if (r > bestR) {
        bestR = r;
        best = id;
      }
    }
    setActiveVideoId((prev) => (prev === best ? prev : best));
  }, []);

  const reportVisibility = React.useCallback(
    (videoId: string, ratio: number, intersecting: boolean) => {
      if (intersecting && ratio >= MIN_RATIO) {
        scoresRef.current.set(videoId, ratio);
      } else {
        scoresRef.current.delete(videoId);
      }
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        flush();
      });
    },
    [flush]
  );

  const value = React.useMemo(() => ({ activeVideoId, reportVisibility }), [activeVideoId, reportVisibility]);

  return <ShortsPlaybackContext.Provider value={value}>{children}</ShortsPlaybackContext.Provider>;
}

export function useShortsPlayback() {
  return React.useContext(ShortsPlaybackContext);
}
