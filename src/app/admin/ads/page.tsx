"use client";

import * as React from "react";

type PlatformAdPosition = "PRE_ROLL" | "MID_ROLL" | "OVERLAY";

type SmartAdRow = {
  id: string;
  title: string;
  description: string | null;
  mediaUrl: string;
  clickUrl: string | null;
  targetCategory: string;
  targetLocation: string;
  position: PlatformAdPosition;
  priority: number;
  isActive: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
  createdAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatCtr(n: number) {
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
}

export default function AdminSmartAdsPage() {
  const [ads, setAds] = React.useState<SmartAdRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const [createTitle, setCreateTitle] = React.useState("");
  const [createDescription, setCreateDescription] = React.useState("");
  const [createMediaUrl, setCreateMediaUrl] = React.useState("");
  const [createClickUrl, setCreateClickUrl] = React.useState("");
  const [createTargetCategory, setCreateTargetCategory] = React.useState("");
  const [createTargetLocation, setCreateTargetLocation] = React.useState("");
  const [createPosition, setCreatePosition] = React.useState<PlatformAdPosition>("OVERLAY");
  const [createPriority, setCreatePriority] = React.useState(0);

  const [editing, setEditing] = React.useState<SmartAdRow | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editMediaUrl, setEditMediaUrl] = React.useState("");
  const [editClickUrl, setEditClickUrl] = React.useState("");
  const [editTargetCategory, setEditTargetCategory] = React.useState("");
  const [editTargetLocation, setEditTargetLocation] = React.useState("");
  const [editPosition, setEditPosition] = React.useState<PlatformAdPosition>("OVERLAY");
  const [editPriority, setEditPriority] = React.useState(0);
  const [editActive, setEditActive] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ads", { cache: "no-store", credentials: "include" });
      const data = (await res.json()) as { ads?: SmartAdRow[]; error?: string };
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
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: createTitle,
          description: createDescription.trim() || null,
          mediaUrl: createMediaUrl,
          clickUrl: createClickUrl.trim() || null,
          targetCategory: createTargetCategory,
          targetLocation: createTargetLocation,
          position: createPosition,
          priority: createPriority,
          isActive: true,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to create ad.");
      setCreateTitle("");
      setCreateDescription("");
      setCreateMediaUrl("");
      setCreateClickUrl("");
      setCreateTargetCategory("");
      setCreateTargetLocation("");
      setCreatePosition("OVERLAY");
      setCreatePriority(0);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create failed.");
    }
  };

  const deleteAd = async (id: string) => {
    const ok = window.confirm("Delete this smart ad?");
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const toggleActive = async (row: SmartAdRow) => {
    setError("");
    const next = !row.isActive;
    setAds((prev) => prev.map((a) => (a.id === row.id ? { ...a, isActive: next } : a)));
    try {
      const res = await fetch(`/api/admin/ads/${encodeURIComponent(row.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: next }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to update.");
    } catch (e: unknown) {
      setAds((prev) => prev.map((a) => (a.id === row.id ? { ...a, isActive: row.isActive } : a)));
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const openEdit = (row: SmartAdRow) => {
    setEditing(row);
    setEditTitle(row.title);
    setEditDescription(row.description ?? "");
    setEditMediaUrl(row.mediaUrl);
    setEditClickUrl(row.clickUrl ?? "");
    setEditTargetCategory(row.targetCategory);
    setEditTargetLocation(row.targetLocation);
    setEditPosition(row.position);
    setEditPriority(row.priority);
    setEditActive(row.isActive);
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/${encodeURIComponent(editing.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editTitle,
          description: editDescription.trim() || null,
          mediaUrl: editMediaUrl,
          clickUrl: editClickUrl.trim() || null,
          targetCategory: editTargetCategory,
          targetLocation: editTargetLocation,
          position: editPosition,
          priority: editPriority,
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
          <h1 className="text-2xl font-semibold text-white">Smart ads</h1>
          <p className="mt-1 text-sm text-white/60">
            Level-3 inventory: targeting, scoring, impressions, clicks, and CTR. Empty inventory seeds a demo
            creative tied to your first listing.
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
            value={createMediaUrl}
            onChange={(e) => setCreateMediaUrl(e.target.value)}
            placeholder="Media URL (image or .mp4)"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none text-sm"
          />
          <input
            value={createClickUrl}
            onChange={(e) => setCreateClickUrl(e.target.value)}
            placeholder="Click URL (optional)"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none text-sm"
          />
          <input
            value={createTargetCategory}
            onChange={(e) => setCreateTargetCategory(e.target.value)}
            placeholder="Target category (empty = any), e.g. APARTMENT"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none text-sm"
          />
          <input
            value={createTargetLocation}
            onChange={(e) => setCreateTargetLocation(e.target.value)}
            placeholder="Target location (empty = any), e.g. Dubai"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none text-sm"
          />
          <div className="flex gap-3 md:col-span-2">
            <div className="flex-1">
              <label className="block text-xs text-white/60 mb-1">Slot</label>
              <select
                value={createPosition}
                onChange={(e) => setCreatePosition(e.target.value as PlatformAdPosition)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
              >
                <option value="PRE_ROLL">Pre-roll (gates player)</option>
                <option value="MID_ROLL">Mid-roll</option>
                <option value="OVERLAY">Overlay</option>
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-white/60 mb-1">Priority</label>
              <input
                type="number"
                value={createPriority}
                onChange={(e) => setCreatePriority(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none tabular-nums"
              />
            </div>
          </div>
          <textarea
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="md:col-span-2 w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none resize-none"
          />
          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={() => void createAd()}
              disabled={!createTitle.trim() || !createMediaUrl.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
          <h2 className="text-white font-semibold">All smart ads</h2>
          <span className="text-xs text-white/50">{loading ? "Loading…" : `${ads.length} total`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="text-left text-white/70 bg-white/5">
              <tr>
                <th className="py-3 px-4 font-medium">Active</th>
                <th className="py-3 px-4 font-medium">Title</th>
                <th className="py-3 px-4 font-medium">Slot</th>
                <th className="py-3 px-4 font-medium">Targeting</th>
                <th className="py-3 px-4 font-medium tabular-nums">Impr.</th>
                <th className="py-3 px-4 font-medium tabular-nums">Clicks</th>
                <th className="py-3 px-4 font-medium tabular-nums">CTR</th>
                <th className="py-3 px-4 font-medium">Created</th>
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
                  <td className="py-3 px-4 max-w-[200px]">
                    <p className="font-medium text-white line-clamp-1">{a.title}</p>
                    <p className="text-xs text-white/45 line-clamp-1 font-mono break-all">{a.mediaUrl}</p>
                  </td>
                  <td className="py-3 px-4 text-white/70 whitespace-nowrap">
                    {a.position}
                    <span className="ml-2 text-white/40">p{a.priority}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-white/60 max-w-[220px]">
                    <p className="line-clamp-1">
                      <span className="text-white/40">cat:</span> {a.targetCategory || "—"}
                    </p>
                    <p className="line-clamp-1">
                      <span className="text-white/40">loc:</span> {a.targetLocation || "—"}
                    </p>
                  </td>
                  <td className="py-3 px-4 tabular-nums">{a.impressions}</td>
                  <td className="py-3 px-4 tabular-nums">{a.clicks}</td>
                  <td className="py-3 px-4 tabular-nums text-indigo-200">{formatCtr(a.ctr)}</td>
                  <td className="py-3 px-4 text-white/50 tabular-nums whitespace-nowrap">
                    {formatDate(a.createdAt)}
                  </td>
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
                  <td colSpan={9} className="py-8 px-4 text-center text-white/50">
                    No rows (demo is created automatically on first load when the inventory is empty).
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
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Edit smart ad</h3>
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
                value={editMediaUrl}
                onChange={(e) => setEditMediaUrl(e.target.value)}
                placeholder="Media URL"
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white font-mono text-xs outline-none"
              />
              <input
                value={editClickUrl}
                onChange={(e) => setEditClickUrl(e.target.value)}
                placeholder="Click URL"
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white font-mono text-xs outline-none"
              />
              <input
                value={editTargetCategory}
                onChange={(e) => setEditTargetCategory(e.target.value)}
                placeholder="Target category"
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white text-sm outline-none"
              />
              <input
                value={editTargetLocation}
                onChange={(e) => setEditTargetLocation(e.target.value)}
                placeholder="Target location"
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white text-sm outline-none"
              />
              <select
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value as PlatformAdPosition)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
              >
                <option value="PRE_ROLL">PRE_ROLL</option>
                <option value="MID_ROLL">MID_ROLL</option>
                <option value="OVERLAY">OVERLAY</option>
              </select>
              <input
                type="number"
                value={editPriority}
                onChange={(e) => setEditPriority(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none tabular-nums"
              />
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
