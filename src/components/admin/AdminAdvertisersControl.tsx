"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

type Row = {
  id: string;
  businessName: string;
  userId: string;
  balance: string;
  walletBalance: string;
  campaignsCount: number;
  adsCount: number;
  user: { email: string; fullName: string; isBlocked: boolean; role: string };
};

export default function AdminAdvertisersControl() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [q, setQ] = React.useState("");
  const [blockedOnly, setBlockedOnly] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (blockedOnly) params.set("blocked", "1");
      const res = await fetch(`/api/admin/advertisers?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as { advertisers?: Row[]; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load.");
      setRows(j.advertisers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [q, blockedOnly]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const setBlocked = async (userId: string, isBlocked: boolean) => {
    setBusy(userId);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked }),
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
        <h1 className="text-2xl font-semibold">Advertisers</h1>
        <p className="mt-1 text-sm text-white/60">
          Advertiser profiles linked to Studio. Blocking a user stops their USER ads from serving.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search business, email…"
          className="min-w-[240px] flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} />
          Blocked only
        </label>
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
                <th className="p-3">Business</th>
                <th className="p-3">User</th>
                <th className="p-3">Wallet / profile</th>
                <th className="p-3">Campaigns / ads</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="p-3 font-medium">{r.businessName}</td>
                  <td className="p-3">
                    <div>{r.user.email}</div>
                    <div className="text-xs text-white/45">
                      {r.user.fullName} · {r.user.role}
                    </div>
                    {r.user.isBlocked ? <span className="text-xs text-rose-300">Blocked</span> : null}
                  </td>
                  <td className="p-3 tabular-nums text-white/80">
                    wallet {r.walletBalance}
                    <div className="text-xs text-white/45">profile {r.balance}</div>
                  </td>
                  <td className="p-3">
                    {r.campaignsCount} / {r.adsCount}
                  </td>
                  <td className="p-3">
                    {r.user.isBlocked ? (
                      <button
                        type="button"
                        disabled={busy === r.userId}
                        className="rounded-lg border border-emerald-500/40 px-3 py-1 text-xs text-emerald-200 disabled:opacity-40"
                        onClick={() => void setBlocked(r.userId, false)}
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === r.userId}
                        className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs text-rose-200 disabled:opacity-40"
                        onClick={() => void setBlocked(r.userId, true)}
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <p className="p-6 text-sm text-white/45">No advertisers match.</p> : null}
        </div>
      )}
    </div>
  );
}
