"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  status: string;
  budget: string;
  spent: string;
  dailyBudget: string;
  adsCount: number;
  advertiser: {
    businessName: string;
    user: { email: string; isBlocked: boolean };
  };
};

export default function AdminCampaignsControl() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [q, setQ] = React.useState("");
  const [minSpent, setMinSpent] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      if (minSpent.trim()) params.set("minSpent", minSpent.trim());
      const res = await fetch(`/api/admin/campaigns-control?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as { campaigns?: Row[]; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load.");
      setRows(j.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [status, q, minSpent]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const setCampaignStatus = async (id: string, next: "ACTIVE" | "PAUSED" | "ENDED") => {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns-control/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
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

  return (
    <div className="space-y-4 text-white">
      <div>
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <p className="mt-1 text-sm text-white/60">All advertiser campaigns — pause, resume, or end delivery.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PAUSED</option>
          <option value="ENDED">ENDED</option>
          <option value="DELETED">DELETED</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, advertiser, id…"
          className="min-w-[220px] flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
        />
        <input
          value={minSpent}
          onChange={(e) => setMinSpent(e.target.value)}
          placeholder="Min spent"
          className="w-28 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="flex items-center gap-2 text-white/55">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="p-3">Campaign</th>
                <th className="p-3">Advertiser</th>
                <th className="p-3">Status</th>
                <th className="p-3">Budget / spent</th>
                <th className="p-3">Ads</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="font-mono text-[10px] text-white/40">{c.id}</div>
                  </td>
                  <td className="p-3">
                    {c.advertiser.businessName}
                    <div className="text-xs text-white/45">{c.advertiser.user.email}</div>
                    {c.advertiser.user.isBlocked ? (
                      <span className="text-xs text-rose-300">User blocked</span>
                    ) : null}
                  </td>
                  <td className="p-3">{c.status}</td>
                  <td className="p-3 tabular-nums text-white/80">
                    {c.spent} / {c.budget}
                    <div className="text-xs text-white/45">daily {c.dailyBudget}</div>
                  </td>
                  <td className="p-3">{c.adsCount}</td>
                  <td className="p-3">
                    {c.status === "DELETED" ? (
                      <span className="text-white/40">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {c.status === "PAUSED" ? (
                          <button
                            type="button"
                            disabled={busy === c.id}
                            className="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs text-emerald-200 disabled:opacity-40"
                            onClick={() => void setCampaignStatus(c.id, "ACTIVE")}
                          >
                            Resume
                          </button>
                        ) : null}
                        {c.status === "DRAFT" ? (
                          <button
                            type="button"
                            disabled={busy === c.id}
                            className="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs text-emerald-200 disabled:opacity-40"
                            onClick={() => void setCampaignStatus(c.id, "ACTIVE")}
                          >
                            Activate
                          </button>
                        ) : null}
                        {c.status === "ACTIVE" ? (
                          <button
                            type="button"
                            disabled={busy === c.id}
                            className="rounded-lg border border-white/20 px-2 py-1 text-xs disabled:opacity-40"
                            onClick={() => void setCampaignStatus(c.id, "PAUSED")}
                          >
                            Pause
                          </button>
                        ) : null}
                        {c.status !== "ENDED" && c.status !== "DELETED" ? (
                          <button
                            type="button"
                            disabled={busy === c.id}
                            className="rounded-lg border border-amber-500/40 px-2 py-1 text-xs text-amber-200 disabled:opacity-40"
                            onClick={() => void setCampaignStatus(c.id, "ENDED")}
                          >
                            End
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <p className="p-6 text-sm text-white/45">No campaigns match.</p> : null}
        </div>
      )}
    </div>
  );
}
