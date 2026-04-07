"use client";

import * as React from "react";

type Tx = {
  id: string;
  type: string;
  amount: unknown;
  adId: string | null;
  createdAt: string;
};

const QUICK_AMOUNTS = [100, 500, 1000] as const;

export default function StudioBillingPage() {
  const [data, setData] = React.useState<{
    profile: { balance?: unknown } | null;
    campaigns: unknown[];
    wallet?: { balance?: unknown; totalSpent?: unknown };
    transactions?: Tx[];
  }>({ profile: null, campaigns: [] });
  const [analytics, setAnalytics] = React.useState<any>({ rows: [], summary: null });
  const [amount, setAmount] = React.useState("100");

  const load = React.useCallback(async () => {
    const [billingRes, analyticsRes] = await Promise.all([
      fetch("/api/studio/billing"),
      fetch("/api/studio/ads/analytics"),
    ]);
    setData(await billingRes.json().catch(() => ({ profile: null, campaigns: [] })));
    setAnalytics(await analyticsRes.json().catch(() => ({ rows: [], summary: null })));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const addBalance = async () => {
    const res = await fetch("/api/studio/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    if (res.ok) await load();
  };

  const bal = Number(data.wallet?.balance ?? data.profile?.balance ?? 0);
  const spent = Number(data.wallet?.totalSpent ?? 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Billing & Analytics</h1>
      <div className="rounded border border-white/10 bg-white/5 p-4 text-white">
        <div className="text-sm text-white/70">Wallet balance</div>
        <div className="text-xl font-semibold">${bal.toFixed(2)}</div>
        <div className="mt-2 text-sm text-white/70">Total spent (ads)</div>
        <div className="text-lg">${spent.toFixed(2)}</div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            className="min-w-[6rem] rounded border border-white/10 bg-black/30 p-2"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount"
          />
          <button type="button" className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium" onClick={() => void addBalance()}>
            Add balance
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              className="rounded border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
              onClick={() => setAmount(String(n))}
            >
              ${n}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4 text-white">
        <h2 className="font-semibold">Transaction history</h2>
        {(data.transactions?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-white/50">No transactions yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2">Ad</th>
                </tr>
              </thead>
              <tbody>
                {(data.transactions || []).map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-2 pr-3 text-white/70">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3">{t.type}</td>
                    <td className="py-2 pr-3">${Number(t.amount).toFixed(2)}</td>
                    <td className="py-2 font-mono text-xs text-white/50">{t.adId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4 text-white">
        <h2 className="font-semibold">Campaign spend</h2>
        <div className="mt-2 space-y-2">
          {(data.campaigns || []).map((c: any) => (
            <div key={c.id} className="rounded border border-white/10 p-2 text-sm">
              {c.name} — spent ${Number(c.spent || 0).toFixed(2)} / ${Number(c.budget || 0).toFixed(2)}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded border border-white/10 bg-white/5 p-4 text-white">
        <h2 className="font-semibold">Performance</h2>
        {analytics.summary ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
            <div>Impr: {analytics.summary.impressions}</div>
            <div>Views: {analytics.summary.views}</div>
            <div>Clicks: {analytics.summary.clicks}</div>
            <div>Leads: {analytics.summary.leads}</div>
            <div>CPL: ${Number(analytics.summary.costPerLead || 0).toFixed(2)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
