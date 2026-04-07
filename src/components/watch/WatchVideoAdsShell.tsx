"use client";

import * as React from "react";

type ServedAd = {
  id: string;
  type: "VIDEO" | "IMAGE";
  videoUrl?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
  duration: number;
  skipAfter: number;
  ctaType: "CALL" | "WHATSAPP" | "BOOK_VISIT";
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

type LeadFormState = {
  open: boolean;
  adId: string | null;
  name: string;
  phone: string;
  submitting: boolean;
  error: string;
};

async function fetchAd(videoId: string, slot: "PRE_ROLL" | "MID_ROLL") {
  const res = await fetch(`/api/ads/for-video?videoId=${encodeURIComponent(videoId)}&slot=${slot}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return (data?.ad || null) as ServedAd | null;
}

function track(adId: string, event: "impression" | "click") {
  void fetch(`/api/ads/${event}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ adId }),
  }).catch(() => {});
}

export default function WatchVideoAdsShell({
  watchVideoId,
  outerClassName,
  videoRef,
  children,
}: {
  watchVideoId?: string;
  outerClassName: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  children: React.ReactNode;
}) {
  const [preRollAd, setPreRollAd] = React.useState<ServedAd | null>(null);
  const [midRollAd, setMidRollAd] = React.useState<ServedAd | null>(null);
  const [activeAd, setActiveAd] = React.useState<ServedAd | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [shownMid, setShownMid] = React.useState<{ at30: boolean; at60: boolean }>({ at30: false, at60: false });
  const [leadForm, setLeadForm] = React.useState<LeadFormState>({
    open: false,
    adId: null,
    name: "",
    phone: "",
    submitting: false,
    error: "",
  });

  React.useEffect(() => {
    if (!watchVideoId) return;
    void fetchAd(watchVideoId, "PRE_ROLL").then((ad) => {
      setPreRollAd(ad);
      if (ad) {
        track(ad.id, "impression");
        setActiveAd(ad);
      }
    });
    void fetchAd(watchVideoId, "MID_ROLL").then((ad) => setMidRollAd(ad));
  }, [watchVideoId]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el || !activeAd) return;
    try {
      el.pause();
    } catch {
      // ignore
    }
  }, [activeAd, videoRef]);

  React.useEffect(() => {
    if (!activeAd) return;
    const t = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, [activeAd?.id]);

  React.useEffect(() => {
    const el = videoRef?.current;
    if (!el || !midRollAd || activeAd) return;
    const onTime = () => {
      const t = Math.floor(el.currentTime || 0);
      if (!shownMid.at30 && t >= 30) {
        setShownMid((s) => ({ ...s, at30: true }));
        setActiveAd(midRollAd);
        setElapsed(0);
        el.pause();
        track(midRollAd.id, "impression");
      } else if (!shownMid.at60 && t >= 60) {
        setShownMid((s) => ({ ...s, at60: true }));
        setActiveAd(midRollAd);
        setElapsed(0);
        el.pause();
        track(midRollAd.id, "impression");
      }
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [videoRef, midRollAd, activeAd, shownMid]);

  const onSkip = React.useCallback(() => {
    setActiveAd(null);
    setElapsed(0);
    const el = videoRef?.current;
    if (el) void el.play().catch(() => {});
  }, [videoRef]);

  const canSkip = activeAd ? elapsed >= 5 : false;
  const progress = activeAd ? Math.min(100, (elapsed / Math.max(1, activeAd.duration)) * 100) : 0;

  const openLeadForm = React.useCallback((adId: string) => {
    setLeadForm((s) => ({ ...s, open: true, adId, error: "" }));
  }, []);

  const submitLead = React.useCallback(async () => {
    if (!leadForm.adId || !watchVideoId) return;
    const name = leadForm.name.trim();
    const phone = leadForm.phone.trim();
    if (!name || !phone) {
      setLeadForm((s) => ({ ...s, error: "Name and phone are required." }));
      return;
    }
    setLeadForm((s) => ({ ...s, submitting: true, error: "" }));
    try {
      const res = await fetch("/api/ads/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          adId: leadForm.adId,
          videoId: watchVideoId,
          name,
          phone,
          source: "AD",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; whatsappLink?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit lead.");
      }
      if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank", "noopener,noreferrer");
      }
      setLeadForm({ open: false, adId: null, name: "", phone: "", submitting: false, error: "" });
    } catch (e) {
      setLeadForm((s) => ({
        ...s,
        submitting: false,
        error: e instanceof Error ? e.message : "Failed to submit lead.",
      }));
    }
  }, [leadForm.adId, leadForm.name, leadForm.phone, watchVideoId]);

  return (
    <>
      <div className={[outerClassName, "relative overflow-hidden"].filter(Boolean).join(" ")}>
        <div className={["h-full w-full min-h-0", activeAd ? "pointer-events-none opacity-0" : ""].join(" ")}>
          {children}
        </div>
        {activeAd ? (
          <div className="absolute inset-0 z-40 bg-black p-3 md:p-6 text-white">
            <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
              <div className="mb-3 h-1.5 w-full rounded bg-white/10 overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="relative flex-1 rounded-xl border border-white/10 bg-black overflow-hidden">
                {activeAd.type === "VIDEO" && activeAd.videoUrl ? (
                  <video
                    src={activeAd.videoUrl}
                    poster={activeAd.thumbnail || undefined}
                    className="h-full w-full object-contain"
                    autoPlay
                    muted={muted}
                    playsInline
                    onEnded={onSkip}
                  />
                ) : activeAd.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeAd.imageUrl} alt="Ad" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMuted((v) => !v)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs"
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      track(activeAd.id, "click");
                      if (activeAd.ctaUrl) {
                        window.open(activeAd.ctaUrl, "_blank", "noopener,noreferrer");
                      } else {
                        openLeadForm(activeAd.id);
                      }
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold"
                  >
                    {activeAd.ctaLabel || "احصل على السعر النهائي"}
                  </button>
                  <button
                    type="button"
                    disabled={!canSkip}
                    onClick={onSkip}
                    className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40"
                  >
                    {canSkip ? "Skip Ad" : `Skip in ${Math.max(0, 5 - elapsed)}s`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {leadForm.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#0f0f0f] p-4 text-white shadow-2xl">
            <h3 className="text-sm font-semibold">احصل على السعر النهائي</h3>
            <div className="mt-3 space-y-2">
              <input
                value={leadForm.name}
                onChange={(e) => setLeadForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="الاسم"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
              />
              <input
                value={leadForm.phone}
                onChange={(e) => setLeadForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="رقم الهاتف"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
              />
              {leadForm.error ? <p className="text-xs text-rose-300">{leadForm.error}</p> : null}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeadForm({ open: false, adId: null, name: "", phone: "", submitting: false, error: "" })}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => void submitLead()}
                disabled={leadForm.submitting}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                {leadForm.submitting ? "جارٍ الإرسال..." : "إرسال"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
