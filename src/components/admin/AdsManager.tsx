"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type VideoAdSlot = "PRE_ROLL" | "MID_ROLL";

type AdminAdRow = {
  id: string;
  videoUrl: string;
  type: VideoAdSlot;
  skippable: boolean;
  skipAfterSeconds: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type AdminCampaignRow = {
  id: string;
  name: string;
  status: string;
  budget: string;
  advertiserName: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function AdsManager() {
  const [ads, setAds] = React.useState<AdminAdRow[]>([]);
  const [campaigns, setCampaigns] = React.useState<AdminCampaignRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busyId, setBusyId] = React.useState("");
  const [createBusy, setCreateBusy] = React.useState(false);

  const [videoUrl, setVideoUrl] = React.useState("");
  const [slot, setSlot] = React.useState<VideoAdSlot>("PRE_ROLL");
  const [skippable, setSkippable] = React.useState(true);
  const [skipAfterSeconds, setSkipAfterSeconds] = React.useState("5");
  const [active, setActive] = React.useState(true);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editVideoUrl, setEditVideoUrl] = React.useState("");
  const [editSlot, setEditSlot] = React.useState<VideoAdSlot>("PRE_ROLL");
  const [editSkippable, setEditSkippable] = React.useState(true);
  const [editSkipAfter, setEditSkipAfter] = React.useState("5");
  const [editActive, setEditActive] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ads", { credentials: "include", cache: "no-store" });
      const json = (await res.json()) as { ads?: AdminAdRow[]; campaigns?: AdminCampaignRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load ads.");
      setAds(json.ads ?? []);
      setCampaigns(json.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const submitCreate = async () => {
    setCreateBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoUrl.trim(),
          type: slot,
          skippable,
          skipAfterSeconds: Number(skipAfterSeconds) || 5,
          active,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Create failed.");
      setVideoUrl("");
      setSlot("PRE_ROLL");
      setSkippable(true);
      setSkipAfterSeconds("5");
      setActive(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setCreateBusy(false);
    }
  };

  const startEdit = (a: AdminAdRow) => {
    setEditingId(a.id);
    setEditVideoUrl(a.videoUrl);
    setEditSlot(a.type);
    setEditSkippable(a.skippable);
    setEditSkipAfter(String(a.skipAfterSeconds));
    setEditActive(a.active);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusyId(editingId);
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: editVideoUrl.trim(),
          type: editSlot,
          skippable: editSkippable,
          skipAfterSeconds: Number(editSkipAfter) || 5,
          active: editActive,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Update failed.");
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId("");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this video ad?")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Delete failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-8 text-white">
      <div>
        <h2 className="text-lg font-semibold">Video ad inventory</h2>
        <p className="mt-1 text-sm text-white/60">
          Pre-roll and mid-roll MP4 creatives served on the watch page (HTML5). Wallet campaigns below are unchanged for
          billing only.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-white/90">Add creative</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-white/60">
            Video URL
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="https://…/ad.mp4"
            />
          </label>
          <label className="block text-xs text-white/60">
            Slot
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as VideoAdSlot)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="PRE_ROLL">Pre-roll</option>
              <option value="MID_ROLL">Mid-roll</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-white/80">
            <input type="checkbox" checked={skippable} onChange={(e) => setSkippable(e.target.checked)} />
            Skippable
          </label>
          <label className="block text-xs text-white/60">
            Skip after (seconds)
            <input
              value={skipAfterSeconds}
              onChange={(e) => setSkipAfterSeconds(e.target.value)}
              disabled={!skippable}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white disabled:opacity-40"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-white/80 sm:col-span-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (eligible for rotation)
          </label>
        </div>
        <button
          type="button"
          onClick={() => void submitCreate()}
          disabled={createBusy || !videoUrl.trim()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </button>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white/90">Creatives</h3>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : ads.length === 0 ? (
          <p className="mt-3 text-sm text-white/55">No ads yet. Add a URL or set VIDEO_ADS_DEMO_* env vars for mock.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {ads.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm"
              >
                {editingId === a.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block text-xs text-white/60 sm:col-span-2">
                      Video URL
                      <input
                        value={editVideoUrl}
                        onChange={(e) => setEditVideoUrl(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs text-white/60">
                      Slot
                      <select
                        value={editSlot}
                        onChange={(e) => setEditSlot(e.target.value as VideoAdSlot)}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
                      >
                        <option value="PRE_ROLL">Pre-roll</option>
                        <option value="MID_ROLL">Mid-roll</option>
                      </select>
                    </label>
                    <label className="block text-xs text-white/60">
                      Skip after
                      <input
                        value={editSkipAfter}
                        onChange={(e) => setEditSkipAfter(e.target.value)}
                        disabled={!editSkippable}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm disabled:opacity-40"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={editSkippable}
                        onChange={(e) => setEditSkippable(e.target.checked)}
                      />
                      Skippable
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                      Active
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit()}
                        disabled={busyId === a.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-mono text-xs text-white/45">{a.id}</p>
                      <p className="truncate text-white/90">{a.videoUrl}</p>
                      <p className="text-xs text-white/55">
                        {a.type === "PRE_ROLL" ? "Pre-roll" : "Mid-roll"} ·{" "}
                        {a.skippable ? `skip after ${a.skipAfterSeconds}s` : "non-skippable"} ·{" "}
                        {a.active ? "active" : "inactive"} · updated {formatDate(a.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/5"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(a.id)}
                        disabled={busyId === a.id}
                        className="rounded-lg border border-rose-500/40 p-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-white/90">Advertiser campaigns (billing)</h3>
        <p className="mt-1 text-xs text-white/50">Campaign rows are not linked to video creatives in this build.</p>
        {campaigns.length === 0 ? null : (
          <ul className="mt-3 space-y-2 text-xs text-white/70">
            {campaigns.slice(0, 12).map((c) => (
              <li key={c.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="font-medium text-white/85">{c.name}</span> · {c.status} · {c.advertiserName} · budget{" "}
                {c.budget}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
