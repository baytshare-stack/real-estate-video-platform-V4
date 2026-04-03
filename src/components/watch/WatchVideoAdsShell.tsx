"use client";

import * as React from "react";

export type WatchVideoAd = {
  id: string;
  title: string;
  description: string | null;
  position: "BEFORE" | "MID" | "AFTER" | "OVERLAY" | string;
};

function AdCard({
  title,
  description,
  onDismiss,
}: {
  title: string;
  description?: string | null;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-xl border border-indigo-500/35 bg-gradient-to-r from-indigo-950/95 via-zinc-900/95 to-zinc-950/95 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-indigo-200">{title}</p>
          {description ? (
            <p className="mt-1 text-xs leading-snug text-white/70 line-clamp-4">{description}</p>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="h-8 w-8 shrink-0 rounded-lg border border-white/10 bg-white/5 text-lg leading-none text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function WatchVideoAdsShell({
  ads,
  outerClassName,
  videoRef,
  children,
}: {
  ads: WatchVideoAd[];
  outerClassName: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  children: React.ReactNode;
}) {
  const list = Array.isArray(ads) ? ads : [];
  const before = list.filter((a) => a.position === "BEFORE");
  const mid = list.filter((a) => a.position === "MID");
  const after = list.filter((a) => a.position === "AFTER");
  const overlay = list.filter((a) => a.position === "OVERLAY");

  const [dismissed, setDismissed] = React.useState<Record<string, boolean>>({});
  const dismiss = (id: string) => setDismissed((d) => ({ ...d, [id]: true }));

  const [midOpen, setMidOpen] = React.useState(false);
  const midShownRef = React.useRef(false);

  React.useEffect(() => {
    midShownRef.current = false;
    setMidOpen(false);
  }, [list]);

  React.useEffect(() => {
    if (!mid.length || midShownRef.current) return;

    if (!videoRef) {
      const t = window.setTimeout(() => {
        if (!midShownRef.current) {
          midShownRef.current = true;
          setMidOpen(true);
        }
      }, 12000);
      return () => window.clearTimeout(t);
    }

    let detach: (() => void) | null = null;
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      const el = videoRef.current;
      if (el && !midShownRef.current) {
        const onTime = () => {
          if (midShownRef.current) return;
          const dur = el.duration;
          if (dur > 0 && !Number.isNaN(dur) && el.currentTime >= dur * 0.5) {
            midShownRef.current = true;
            setMidOpen(true);
          }
        };
        el.addEventListener("timeupdate", onTime);
        detach = () => el.removeEventListener("timeupdate", onTime);
        window.clearInterval(poll);
        return;
      }
      if (attempts >= 60 && !midShownRef.current) {
        window.clearInterval(poll);
        midShownRef.current = true;
        setMidOpen(true);
      }
    }, 100);

    return () => {
      window.clearInterval(poll);
      detach?.();
    };
  }, [mid.length, videoRef]);

  const visibleOverlay = overlay.filter((a) => !dismissed[a.id]);
  const visibleMid = midOpen ? mid.filter((a) => !dismissed[a.id]) : [];

  return (
    <>
      {before.length ? (
        <div className="mb-2 space-y-2">
          {before.map((a) =>
            dismissed[a.id] ? null : (
              <AdCard key={a.id} title={a.title} description={a.description} onDismiss={() => dismiss(a.id)} />
            )
          )}
        </div>
      ) : null}

      <div className={[outerClassName, "relative"].filter(Boolean).join(" ")}>
        {children}

        {visibleOverlay.length ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end gap-2 p-3 md:p-4">
            {visibleOverlay.map((a) => (
              <div key={a.id} className="pointer-events-auto max-w-full md:max-w-lg">
                <AdCard title={a.title} description={a.description} onDismiss={() => dismiss(a.id)} />
              </div>
            ))}
          </div>
        ) : null}

        {visibleMid.length ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md space-y-3">
              {visibleMid.map((a) => (
                <AdCard key={a.id} title={a.title} description={a.description} onDismiss={() => dismiss(a.id)} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {after.length ? (
        <div className="mt-2 space-y-2">
          {after.map((a) =>
            dismissed[a.id] ? null : (
              <AdCard key={a.id} title={a.title} description={a.description} onDismiss={() => dismiss(a.id)} />
            )
          )}
        </div>
      ) : null}
    </>
  );
}
