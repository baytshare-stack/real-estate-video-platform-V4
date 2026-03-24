"use client";

import * as React from "react";
import Link from "next/link";

type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

type AdminVideoRow = {
  id: string;
  title: string;
  thumbnail: string | null;
  viewsCount: number;
  likesCount: number;
  isShort: boolean;
  moderationStatus: ModerationStatus;
  createdAt: string;
  channelName: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function AdminVideosPage() {
  const [rows, setRows] = React.useState<AdminVideoRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "shorts" | "long" | "mostViewed">("all");
  const [status, setStatus] = React.useState<"" | ModerationStatus>("");
  const [cleanupMessage, setCleanupMessage] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filter !== "all") params.set("filter", filter);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/videos?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as { videos?: AdminVideoRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load videos.");
      setRows(data.videos || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load videos.");
    } finally {
      setLoading(false);
    }
  }, [filter, search, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateRow = async (id: string, patch: Partial<Pick<AdminVideoRow, "isShort" | "moderationStatus">>) => {
    setRows((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    try {
      const res = await fetch(`/api/admin/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to update video.");
    } catch (e: any) {
      setError(e?.message || "Failed to update video.");
      void load();
    }
  };

  const deleteRow = async (id: string) => {
    const ok = window.confirm("Delete this video? This cannot be undone.");
    if (!ok) return;
    const prev = rows;
    setRows((r) => r.filter((v) => v.id !== id));
    try {
      const res = await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete video.");
    } catch (e: any) {
      setError(e?.message || "Failed to delete video.");
      setRows(prev);
    }
  };

  const clearDemoContent = async (execute: boolean) => {
    setError("");
    setCleanupMessage("");
    try {
      const res = await fetch("/api/admin/videos/clear-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execute }),
      });
      const data = (await res.json()) as {
        error?: string;
        mode?: "dry-run" | "delete";
        count?: number;
        deletedCount?: number;
      };
      if (!res.ok) throw new Error(data.error || "Failed to clear demo content.");

      if (data.mode === "dry-run") {
        setCleanupMessage(`Dry run: ${data.count ?? 0} demo shorts matched. Nothing deleted.`);
      } else {
        setCleanupMessage(`Deleted ${data.deletedCount ?? 0} demo shorts successfully.`);
        void load();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to clear demo content.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Videos</h1>
          <p className="mt-1 text-sm text-white/60">
            Moderate content, filter Shorts/Long, and manage video lifecycle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void clearDemoContent(false)}
            className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
          >
            Dry Run Demo Cleanup
          </button>
          <button
            type="button"
            onClick={() => {
              const ok = window.confirm("Delete only matched demo SHORTS now?");
              if (ok) void clearDemoContent(true);
            }}
            className="inline-flex items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
          >
            Clear Demo Content
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-2">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title…"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Filter</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <option value="all">All</option>
            <option value="shorts">Shorts only</option>
            <option value="long">Long videos only</option>
            <option value="mostViewed">Most viewed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Moderation</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {cleanupMessage ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {cleanupMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-white/70">
                <th className="px-4 py-3 font-medium">Video</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Views</th>
                <th className="px-4 py-3 font-medium">Likes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={7}>
                    No videos found.
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className="text-white/80 align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3 min-w-[380px]">
                        <img
                          src={
                            v.thumbnail ||
                            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=320&h=180"
                          }
                          alt={v.title}
                          className="h-[54px] w-[96px] rounded-xl object-cover border border-white/10 bg-black"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/watch/${v.id}`}
                            target="_blank"
                            className="block font-medium text-white hover:text-indigo-300 transition line-clamp-2"
                          >
                            {v.title}
                          </Link>
                          <p className="mt-1 text-xs text-white/50 line-clamp-1">{v.channelName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void updateRow(v.id, { isShort: !v.isShort })}
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition",
                          v.isShort
                            ? "border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                        ].join(" ")}
                        title="Toggle short/long"
                      >
                        {v.isShort ? "SHORT" : "LONG"}
                      </button>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{v.viewsCount.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{v.likesCount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {v.moderationStatus === "APPROVED" ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                          APPROVED
                        </span>
                      ) : v.moderationStatus === "REJECTED" ? (
                        <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                          REJECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">{formatDate(v.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void updateRow(v.id, { moderationStatus: "APPROVED" })}
                          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/15"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateRow(v.id, { moderationStatus: "REJECTED" })}
                          className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/15"
                        >
                          Reject
                        </button>
                        <Link
                          href={`/admin/videos/${v.id}/edit`}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => void deleteRow(v.id)}
                          className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

