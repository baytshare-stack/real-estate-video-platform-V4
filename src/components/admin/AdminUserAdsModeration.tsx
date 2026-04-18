"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

type Row = {
  id: string;
  publisher: string;
  adminReviewStatus: string;
  active: boolean;
  mediaType: string;
  type: string;
  videoUrl?: string | null;
  imageUrl?: string | null;
  owner: { email: string; fullName: string; isBlocked: boolean } | null;
  campaign: { name: string; status: string } | null;
  performance: { impressions: number; clicks: number; leads: number } | null;
};

export default function AdminUserAdsModeration() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [publisher, setPublisher] = React.useState("");
  const [review, setReview] = React.useState("");
  const [q, setQ] = React.useState("");
  const [campaignStatus, setCampaignStatus] = React.useState("");
  const [minImpr, setMinImpr] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (publisher) params.set("publisher", publisher);
      if (review) params.set("review", review);
      if (q.trim()) params.set("q", q.trim());
      if (campaignStatus) params.set("campaignStatus", campaignStatus);
      if (minImpr.trim()) params.set("minImpr", minImpr.trim());
      const res = await fetch(`/api/admin/ads-control?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as { ads?: Row[]; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load.");
      setRows(j.ads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [publisher, review, q, campaignStatus, minImpr]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/ads-control/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Update failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this ad permanently?")) return;
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/ads-control/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Delete failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">All ads (moderation)</h2>
        <p className="mt-1 text-sm text-white/55">
          Approve or reject advertiser creatives, pause delivery, or remove ads. Global (ADMIN) inventory is created
          above; user ads require <span className="text-amber-200/90">APPROVED</span> to serve.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
        >
          <option value="">All publishers</option>
          <option value="USER">USER (advertisers)</option>
          <option value="ADMIN">ADMIN (global)</option>
        </select>
        <select
          value={review}
          onChange={(e) => setReview(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
        >
          <option value="">All review states</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <select
          value={campaignStatus}
          onChange={(e) => setCampaignStatus(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
        >
          <option value="">Any campaign status</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PAUSED</option>
          <option value="ENDED">ENDED</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, campaign…"
          className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
        />
        <input
          value={minImpr}
          onChange={(e) => setMinImpr(e.target.value)}
          placeholder="Min impressions"
          className="w-32 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
        />
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/90">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="py-2 pr-2">Ad</th>
                <th className="py-2 pr-2">Owner</th>
                <th className="py-2 pr-2">Campaign</th>
                <th className="py-2 pr-2">Review</th>
                <th className="py-2 pr-2">Perf</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-2 pr-2 font-mono text-[10px] text-white/50">
                    <div className="max-w-[140px] truncate">{r.id}</div>
                    <div className="text-white/70">
                      {r.mediaType} · {r.type} {r.active ? "" : "(inactive)"}
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    {r.owner ? (
                      <>
                        <div className="truncate">{r.owner.email}</div>
                        {r.owner.isBlocked ? (
                          <span className="text-rose-300">Blocked</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-white/40">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {r.campaign ? (
                      <>
                        {r.campaign.name}
                        <div className="text-white/45">{r.campaign.status}</div>
                      </>
                    ) : (
                      <span className="text-white/40">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <span
                      className={
                        r.adminReviewStatus === "APPROVED"
                          ? "text-emerald-300"
                          : r.adminReviewStatus === "REJECTED"
                            ? "text-rose-300"
                            : "text-amber-200"
                      }
                    >
                      {r.adminReviewStatus}
                    </span>
                  </td>
                  <td className="py-2 pr-2 tabular-nums text-white/70">
                    i{r.performance?.impressions ?? 0} c{r.performance?.clicks ?? 0} l
                    {r.performance?.leads ?? 0}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.publisher === "USER" && r.adminReviewStatus !== "APPROVED" ? (
                        <button
                          type="button"
                          disabled={busy === r.id}
                          className="rounded border border-emerald-500/40 px-2 py-0.5 text-emerald-200 disabled:opacity-40"
                          onClick={() => void patch(r.id, { adminReviewStatus: "APPROVED" })}
                        >
                          Approve
                        </button>
                      ) : null}
                      {r.adminReviewStatus !== "REJECTED" ? (
                        <button
                          type="button"
                          disabled={busy === r.id}
                          className="rounded border border-rose-500/40 px-2 py-0.5 text-rose-200 disabled:opacity-40"
                          onClick={() => void patch(r.id, { adminReviewStatus: "REJECTED", active: false })}
                        >
                          Reject
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy === r.id}
                        className="rounded border border-white/20 px-2 py-0.5 disabled:opacity-40"
                        onClick={() => void patch(r.id, { active: !r.active })}
                      >
                        {r.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === r.id}
                        className="rounded border border-white/15 px-2 py-0.5 text-rose-200/90 disabled:opacity-40"
                        onClick={() => void remove(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <p className="py-6 text-sm text-white/45">No ads match filters.</p> : null}
        </div>
      )}
    </div>
  );
}
