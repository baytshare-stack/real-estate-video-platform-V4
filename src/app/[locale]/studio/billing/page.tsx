"use client";

import * as React from "react";

export default function StudioBillingPage() {
  const [data, setData] = React.useState<any>({ profile: null, campaigns: [] });
  const [analytics, setAnalytics] = React.useState<any>({ rows: [], summary: null });
  const [amount, setAmount] = React.useState("200");

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

  const topup = async () => {
    const res = await fetch("/api/studio/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Billing & Analytics</h1>
      <div className="rounded border border-white/10 bg-white/5 p-4 text-white">
        <div>Balance: ${Number(data.profile?.balance || 0).toFixed(2)}</div>
        <div className="mt-3 flex gap-2">
          <input className="rounded border border-white/10 bg-black/30 p-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button className="rounded bg-indigo-600 px-3 py-2" onClick={() => void topup()}>Top-up</button>
        </div>
      </div>
      <div className="rounded border border-white/10 bg-white/5 p-4 text-white">
        <h2 className="font-semibold">Campaign spend</h2>
        <div className="mt-2 space-y-2">
          {(data.campaigns || []).map((c: any) => (
            <div key={c.id} className="rounded border border-white/10 p-2 text-sm">
              {c.name} - spent ${Number(c.spent || 0).toFixed(2)} / ${Number(c.budget || 0).toFixed(2)}
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

