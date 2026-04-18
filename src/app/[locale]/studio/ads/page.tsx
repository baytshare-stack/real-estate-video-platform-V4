"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { StudioAdsPageHeader } from "@/components/studio/ads/StudioAdsBreadcrumb";

type CampaignOpt = { id: string; name: string; status?: string };
type CreativeKind = "VIDEO" | "TEXT";
type UserAdRow = {
  id: string;
  creativeKind?: CreativeKind;
  videoUrl?: string | null;
  textBody?: string | null;
  textDisplayMode?: "OVERLAY" | "CARD" | null;
  type: string;
  skippable: boolean;
  skipAfterSeconds: number;
  active: boolean;
  targetVideoId: string | null;
  campaignId: string | null;
  campaign?: { id: string; name: string; status: string } | null;
};

export default function StudioAdsPage() {
  const [ads, setAds] = React.useState<UserAdRow[]>([]);
  const [campaigns, setCampaigns] = React.useState<CampaignOpt[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const [campaignId, setCampaignId] = React.useState("");
  const [creativeKind, setCreativeKind] = React.useState<CreativeKind>("VIDEO");
  const [videoUrl, setVideoUrl] = React.useState("");
  const [textBody, setTextBody] = React.useState("");
  const [textDisplayMode, setTextDisplayMode] = React.useState<"OVERLAY" | "CARD">("OVERLAY");
  const [slot, setSlot] = React.useState<"PRE_ROLL" | "MID_ROLL">("PRE_ROLL");
  const [targetVideoId, setTargetVideoId] = React.useState("");
  const [skippable, setSkippable] = React.useState(true);
  const [skipAfter, setSkipAfter] = React.useState("5");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [adRes, campRes] = await Promise.all([
        fetch("/api/studio/ads", { credentials: "include", cache: "no-store" }),
        fetch("/api/studio/campaigns", { credentials: "include", cache: "no-store" }),
      ]);
      const adJson = (await adRes.json()) as { ads?: UserAdRow[]; notice?: string; error?: string };
      const campJson = (await campRes.json()) as { campaigns?: CampaignOpt[] };
      if (!adRes.ok) throw new Error(adJson.error || "Failed to load ads.");
      setAds(adJson.ads ?? []);
      setNotice(adJson.notice ?? null);
      if (campRes.ok) setCampaigns(campJson.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/studio/ads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaignId.trim(),
          creativeKind,
          videoUrl: creativeKind === "VIDEO" ? videoUrl.trim() : undefined,
          textBody: creativeKind === "TEXT" ? textBody.trim() : undefined,
          textDisplayMode: creativeKind === "TEXT" ? textDisplayMode : undefined,
          type: slot,
          targetVideoId: targetVideoId.trim() || null,
          skippable,
          skipAfterSeconds: Number(skipAfter) || 5,
          active: true,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Create failed.");
      setVideoUrl("");
      setTextBody("");
      setTargetVideoId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row: UserAdRow) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/studio/ads/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Update failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this promotion?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/studio/ads/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Delete failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const createDisabled =
    busy || !campaignId.trim() || (creativeKind === "VIDEO" ? !videoUrl.trim() : !textBody.trim());

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white">
      <StudioAdsPageHeader
        segment="ads"
        title="Promotions"
        subtitle="Create video or text ads inside your billing campaigns. Platform-wide ads are managed in Admin → Ads."
      />

      <p className="mt-4 text-sm text-white/60">
        Platform-wide ads:{" "}
        <Link href="/admin/ads" className="font-semibold text-indigo-400 underline-offset-2 hover:underline">
          Admin → Ads
        </Link>
        .
      </p>

      {notice ? <p className="mt-3 text-sm text-amber-200/90">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-8 space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white/90">New promotion</h2>
          <p className="mt-1 text-xs text-white/50">
            Ads only run when the linked campaign is ACTIVE and still has budget. Target a listing id to show on one video
            only, or leave it empty for all of your channel’s listings.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/60 sm:col-span-2">
              Campaign
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="">Select…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              Creative type
              <select
                value={creativeKind}
                onChange={(e) => setCreativeKind(e.target.value as CreativeKind)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="VIDEO">Video (URL or upload)</option>
                <option value="TEXT">Text (overlay / card)</option>
              </select>
            </label>
            {creativeKind === "VIDEO" ? (
              <label className="block text-xs text-white/60 sm:col-span-2">
                Ad video URL (MP4)
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  placeholder="https://…/promo.mp4"
                />
              </label>
            ) : (
              <>
                <label className="block text-xs text-white/60 sm:col-span-2">
                  Ad copy
                  <textarea
                    value={textBody}
                    onChange={(e) => setTextBody(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                    placeholder="Promo message…"
                  />
                </label>
                <label className="block text-xs text-white/60">
                  Layout
                  <select
                    value={textDisplayMode}
                    onChange={(e) => setTextDisplayMode(e.target.value as "OVERLAY" | "CARD")}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  >
                    <option value="OVERLAY">Bottom overlay</option>
                    <option value="CARD">Center card</option>
                  </select>
                </label>
              </>
            )}
            <label className="block text-xs text-white/60">
              Slot
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as "PRE_ROLL" | "MID_ROLL")}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="PRE_ROLL">Pre-roll</option>
                <option value="MID_ROLL">Mid-roll</option>
              </select>
            </label>
            <label className="block text-xs text-white/60">
              Target listing (video id), optional
              <input
                value={targetVideoId}
                onChange={(e) => setTargetVideoId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="cuid…"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input type="checkbox" checked={skippable} onChange={(e) => setSkippable(e.target.checked)} />
              Skippable
            </label>
            <label className="block text-xs text-white/60">
              Skip after (seconds)
              <input
                value={skipAfter}
                onChange={(e) => setSkipAfter(e.target.value)}
                disabled={!skippable}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white disabled:opacity-40"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={createDisabled}
            onClick={() => void submit()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create promotion
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white/90">Your promotions</h2>
          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : ads.length === 0 ? (
            <p className="mt-3 text-sm text-white/55">No user ads yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {ads.map((a) => (
                <li key={a.id} className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                  <p className="font-mono text-[11px] text-white/45">{a.id}</p>
                  <p className="text-xs text-indigo-300/90">
                    {a.creativeKind === "TEXT" ? "Text" : "Video"} · {a.type}
                  </p>
                  {a.creativeKind === "TEXT" ? (
                    <p className="mt-1 line-clamp-3 text-white/85">{a.textBody}</p>
                  ) : (
                    <p className="truncate text-white/90">{a.videoUrl}</p>
                  )}
                  <p className="mt-1 text-xs text-white/55">
                    {a.skippable ? `skip ${a.skipAfterSeconds}s` : "non-skippable"} ·{" "}
                    {a.targetVideoId ? `listing ${a.targetVideoId}` : "all your listings"} ·{" "}
                    {a.campaign?.name ?? a.campaignId}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleActive(a)}
                      className="rounded-lg border border-white/20 px-2 py-1 text-xs"
                    >
                      {a.active ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(a.id)}
                      className="rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
