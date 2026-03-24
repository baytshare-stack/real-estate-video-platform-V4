"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Edit2, Reply, ThumbsUp, Trash2, XCircle } from "lucide-react";

type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminVideoRow = {
  id: string;
  title: string;
  thumbnail?: string | null;
  viewsCount: number;
  likesCount: number;
  isShort: boolean;
  moderationStatus: ModerationStatus;
  createdAt: string;
  channelName?: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

type FilterMode = "shorts" | "long" | "mostViewed";

const MOCK_VIDEOS: AdminVideoRow[] = [
  {
    id: "v_1",
    title: "Luxury Penthouse with Skyline Views",
    thumbnail: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450",
    viewsCount: 12500,
    likesCount: 840,
    isShort: false,
    moderationStatus: "PENDING",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    channelName: "BytakTube Realty",
  },
  {
    id: "v_2",
    title: "3BR Apartment Tour in Downtown (Short)",
    thumbnail: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400&h=700",
    viewsCount: 42200,
    likesCount: 2300,
    isShort: true,
    moderationStatus: "APPROVED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    channelName: "City Moves",
  },
  {
    id: "v_3",
    title: "Villa Walkthrough with Private Pool (Long)",
    thumbnail: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=800&h=450",
    viewsCount: 9800,
    likesCount: 420,
    isShort: false,
    moderationStatus: "REJECTED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    channelName: "Luxury Estates",
  },
];

export default function VideoTable({
  videos,
  onDelete,
  onApprove,
  onReject,
}: {
  videos?: AdminVideoRow[];
  onDelete?: (videoId: string) => Promise<void> | void;
  onApprove?: (videoId: string) => Promise<void> | void;
  onReject?: (videoId: string) => Promise<void> | void;
}) {
  const [rows, setRows] = React.useState<AdminVideoRow[]>(videos ?? MOCK_VIDEOS);
  const [filter, setFilter] = React.useState<"" | FilterMode>("");
  const [busyId, setBusyId] = React.useState<string>("");

  const [editing, setEditing] = React.useState<AdminVideoRow | null>(null);
  const [editTitle, setEditTitle] = React.useState("");

  React.useEffect(() => {
    setRows(videos ?? MOCK_VIDEOS);
  }, [videos]);

  const filtered = React.useMemo(() => {
    const base = rows.filter((v) => {
      if (filter === "shorts") return v.isShort;
      if (filter === "long") return !v.isShort;
      return true;
    });
    if (filter === "mostViewed") {
      return [...base].sort((a, b) => b.viewsCount - a.viewsCount);
    }
    return base.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rows, filter]);

  const confirmDelete = async (v: AdminVideoRow) => {
    const ok = window.confirm(`Delete "${v.title}"? This action cannot be undone.`);
    if (!ok) return;
    setBusyId(v.id);
    const prev = rows;
    setRows((p) => p.filter((x) => x.id !== v.id));
    try {
      await onDelete?.(v.id);
    } catch {
      setRows(prev);
    } finally {
      setBusyId("");
    }
  };

  const approve = async (v: AdminVideoRow) => {
    setBusyId(v.id);
    const prev = rows;
    setRows((p) => p.map((x) => (x.id === v.id ? { ...x, moderationStatus: "APPROVED" } : x)));
    try {
      await onApprove?.(v.id);
    } catch {
      setRows(prev);
    } finally {
      setBusyId("");
    }
  };

  const reject = async (v: AdminVideoRow) => {
    setBusyId(v.id);
    const prev = rows;
    setRows((p) => p.map((x) => (x.id === v.id ? { ...x, moderationStatus: "REJECTED" } : x)));
    try {
      await onReject?.(v.id);
    } catch {
      setRows(prev);
    } finally {
      setBusyId("");
    }
  };

  const openEdit = (v: AdminVideoRow) => {
    setEditing(v);
    setEditTitle(v.title ?? "");
  };

  const closeEdit = () => {
    setEditing(null);
    setEditTitle("");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-semibold">Videos</h2>
          <p className="text-sm text-white/60 mt-1">Thumbnails, engagement, and moderation actions.</p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter((e.target.value || "") as any)}
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              <option value="">All</option>
              <option value="shorts">Shorts only</option>
              <option value="long">Long videos only</option>
              <option value="mostViewed">Most viewed</option>
            </select>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/60">Total shown</p>
            <p className="mt-1 text-lg font-semibold text-white tabular-nums">{filtered.length}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Thumbnail / Title</th>
              <th className="px-4 py-3 font-medium">Video type</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Likes</th>
              <th className="px-4 py-3 font-medium">Moderation</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.map((v) => {
              const typeLabel = v.isShort ? "short" : "long";
              return (
                <tr key={v.id} className="text-white/80 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3 min-w-[520px]">
                      <div className="relative flex-shrink-0">
                        <img
                          src={
                            v.thumbnail ??
                            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450"
                          }
                          alt={v.title}
                          className="h-[56px] w-[100px] rounded-xl object-cover border border-white/10 bg-black"
                        />
                        <span
                          className={[
                            "absolute -top-2 -right-2 rounded-full px-2 py-1 border text-[10px] font-bold backdrop-blur",
                            v.isShort ? "border-red-400/30 bg-red-500/15 text-red-200" : "border-white/10 bg-white/5 text-white/70",
                          ].join(" ")}
                        >
                          {typeLabel.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/watch/${v.id}`}
                          target="_blank"
                          className="block font-medium text-white hover:text-indigo-300 transition line-clamp-2"
                        >
                          {v.title}
                        </Link>
                        <p className="mt-1 text-xs text-white/50 line-clamp-1">{v.channelName ?? "-"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-white/70">{formatCompact(v.viewsCount ?? 0)}</td>
                  <td className="px-4 py-3 tabular-nums text-white/70">
                    <span className="inline-flex items-center gap-2">
                      <ThumbsUp className="h-3.5 w-3.5 text-red-400/80" />
                      {formatCompact(v.likesCount ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.moderationStatus === "APPROVED" ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        APPROVED
                      </span>
                    ) : v.moderationStatus === "REJECTED" ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                        <XCircle className="h-3.5 w-3.5" />
                        REJECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                        <Reply className="h-3.5 w-3.5" />
                        PENDING
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60 tabular-nums">{formatDate(v.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === v.id}
                        onClick={() => void approve(v)}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === v.id}
                        onClick={() => void reject(v)}
                        className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={busyId === v.id}
                        onClick={() => void confirmDelete(v)}
                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Delete video"
                      >
                        <Trash2 className="h-3.5 w-3.5 inline" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-white/60" colSpan={7}>
                  No videos found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Edit video (mock)</h3>
                <p className="mt-1 text-sm text-white/60">
                  ID: <span className="font-mono text-white/70">{editing?.id ?? "-"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/60">
                  This is a mock edit screen. Hook up real update logic later via your admin API.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // Mock action only.
                    console.log("Mock save:", editing?.id, editTitle);
                    closeEdit();
                  }}
                  className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  Save (mock)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

