"use client";

import * as React from "react";

type AdPosition = "BEFORE" | "MID" | "AFTER" | "OVERLAY";

type VideoAdRow = {
  id: string;
  title: string;
  description: string | null;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string | null;
  position: AdPosition;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function AdminAdsPage() {
  const [ads, setAds] = React.useState<VideoAdRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const [createTitle, setCreateTitle] = React.useState("");
  const [createDescription, setCreateDescription] = React.useState("");
  const [createVideoId, setCreateVideoId] = React.useState("");
  const [createPosition, setCreatePosition] = React.useState<AdPosition>("OVERLAY");

  const [editing, setEditing] = React.useState<VideoAdRow | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editVideoId, setEditVideoId] = React.useState("");
  const [editPosition, setEditPosition] = React.useState<AdPosition>("OVERLAY");
  const [editActive, setEditActive] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/video-ads", { cache: "no-store" });
      const data = (await res.json()) as { ads?: VideoAdRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load ads.");
      setAds(data.ads || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load ads.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createAd = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/video-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle,
          description: createDescription || null,
          videoId: createVideoId,
          position: createPosition,
          isActive: true,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to create ad.");
      setCreateTitle("");
      setCreateDescription("");
      setCreateVideoId("");
      setCreatePosition("OVERLAY");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create failed.");
    }
  };

  const deleteAd = async (id: string) => {
    const ok = window.confirm("Delete this ad?");
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/video-ads/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const toggleActive = async (row: VideoAdRow) => {
    setError("");
    const next = !row.isActive;
    setAds((prev) => prev.map((a) => (a.id === row.id ? { ...a, isActive: next } : a)));
    try {
      const res = await fetch(`/api/admin/video-ads/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to update.");
    } catch (e: unknown) {
      setAds((prev) => prev.map((a) => (a.id === row.id ? { ...a, isActive: row.isActive } : a)));
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const openEdit = (row: VideoAdRow) => {
    setEditing(row);
    setEditTitle(row.title);
    setEditDescription(row.description ?? "");
    setEditVideoId(row.videoId);
    setEditPosition(row.position);
    setEditActive(row.isActive);
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/video-ads/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription.trim() || null,
          videoId: editVideoId.trim(),
          position: editPosition,
          isActive: editActive,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      closeEdit();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Video ads</h1>
          <p className="mt-1 text-sm text-white/60">
            Title, copy, target video, position (pre / mid / post / overlay), and live toggle.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
        <h2 className="text-white font-semibold">Create ad</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none"
          />
          <input
            value={createVideoId}
            onChange={(e) => setCreateVideoId(e.target.value)}
            placeholder="Video ID"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none font-mono text-sm"
          />
          <textarea
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="md:col-span-2 w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none resize-none"
          />
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs text-white/60 mb-1">Position</label>
              <select
                value={createPosition}
                onChange={(e) => setCreatePosition(e.target.value as AdPosition)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
              >
                <option value="BEFORE">Before (above player)</option>
                <option value="MID">Mid-roll (HTML5 at 50%; ~12s cue for embeds)</option>
                <option value="AFTER">After (below player)</option>
                <option value="OVERLAY">Overlay (banner on video)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void createAd()}
              disabled={!createTitle.trim() || !createVideoId.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
          <h2 className="text-white font-semibold">All ads</h2>
          <span className="text-xs text-white/50">{loading ? "Loading…" : `${ads.length} total`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="text-left text-white/70 bg-white/5">
              <tr>
                <th className="py-3 px-4 font-medium">Active</th>
                <th className="py-3 px-4 font-medium">Title</th>
                <th className="py-3 px-4 font-medium">Video</th>
                <th className="py-3 px-4 font-medium">Position</th>
                <th className="py-3 px-4 font-medium">Updated</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {ads.map((a) => (
                <tr key={a.id} className="text-white/80">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => void toggleActive(a)}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium border transition",
                        a.isActive
                          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                          : "border-white/10 bg-white/5 text-white/50",
                      ].join(" ")}
                    >
                      {a.isActive ? "On" : "Off"}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-white line-clamp-1">{a.title}</p>
                    {a.description ? (
                      <p className="text-xs text-white/50 line-clamp-1 mt-0.5">{a.description}</p>
                    ) : null}
                  </td>
                  <td className="py-3 px-4">
                    <p className="line-clamp-1 text-white/90">{a.videoTitle}</p>
                    <p className="text-xs text-white/45 font-mono break-all">{a.videoId}</p>
                  </td>
                  <td className="py-3 px-4 text-white/70">{a.position}</td>
                  <td className="py-3 px-4 text-white/50 tabular-nums">{formatDate(a.updatedAt)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAd(a.id)}
                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/15"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && ads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-white/50">
                    No video ads yet. A demo overlay is created automatically when the catalog is empty.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Edit ad</h3>
            <div className="mt-4 space-y-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none resize-none"
              />
              <input
                value={editVideoId}
                onChange={(e) => setEditVideoId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white font-mono text-sm outline-none"
              />
              <select
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value as AdPosition)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
              >
                <option value="BEFORE">BEFORE</option>
                <option value="MID">MID</option>
                <option value="AFTER">AFTER</option>
                <option value="OVERLAY">OVERLAY</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded border-white/20"
                />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
