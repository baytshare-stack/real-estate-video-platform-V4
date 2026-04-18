"use client";

import * as React from "react";

type WalletRow = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  balance: number;
  totalSpent: number;
  updatedAt: string;
};

type TxRow = {
  id: string;
  userId: string;
  email: string;
  type: string;
  amount: number;
  adId: string | null;
  createdAt: string;
};

type BillingOverview = {
  totalCampaignBudget: number;
  totalCampaignSpent: number;
  activeCampaignsWindow: number;
  totalWalletBalance: number;
  platformWalletSpendTotal: number;
  adImpressionsAllTime: number;
  adClicksAllTime: number;
  adLeadsAllTime: number;
  adSpendTracked: number;
};

export default function AdminAdBillingPage() {
  const [wallets, setWallets] = React.useState<WalletRow[]>([]);
  const [transactions, setTransactions] = React.useState<TxRow[]>([]);
  const [overview, setOverview] = React.useState<BillingOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ad-billing", { cache: "no-store" });
      const data = (await res.json()) as {
        overview?: BillingOverview;
        wallets?: WalletRow[];
        transactions?: TxRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to load.");
      setOverview(data.overview ?? null);
      setWallets(data.wallets || []);
      setTransactions(data.transactions || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <h1 className="text-2xl font-bold">Ad billing & wallets</h1>
        <p className="mt-1 text-sm text-white/60">
          Advertiser balances, campaign budgets and spend, platform revenue (sum of wallet totalSpent), ad performance totals, and
          ledger.
        </p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {loading ? <p className="text-sm text-white/60">Loading…</p> : null}

      {!loading && !error ? (
        <>
          {overview ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Campaign budget (all)</p>
                <p className="mt-1 text-xl font-semibold">${overview.totalCampaignBudget.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Campaign spend (all)</p>
                <p className="mt-1 text-xl font-semibold">${overview.totalCampaignSpent.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Active campaigns (in window)</p>
                <p className="mt-1 text-xl font-semibold">{overview.activeCampaignsWindow}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Advertiser wallet balance (sum)</p>
                <p className="mt-1 text-xl font-semibold">${overview.totalWalletBalance.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Platform revenue (wallet spend)</p>
                <p className="mt-1 text-xl font-semibold">${overview.platformWalletSpendTotal.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Ad spend (tracked)</p>
                <p className="mt-1 text-xl font-semibold">${overview.adSpendTracked.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Impressions (all time)</p>
                <p className="mt-1 text-xl font-semibold">{overview.adImpressionsAllTime.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Clicks · Leads</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.adClicksAllTime.toLocaleString()} · {overview.adLeadsAllTime.toLocaleString()}
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">Advertiser balances</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Balance</th>
                    <th className="py-2 pr-4">Total spent</th>
                    <th className="py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.id} className="border-b border-white/5">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{w.fullName || w.email}</div>
                        <div className="text-xs text-white/50">{w.email}</div>
                      </td>
                      <td className="py-2 pr-4">${w.balance.toFixed(2)}</td>
                      <td className="py-2 pr-4">${w.totalSpent.toFixed(2)}</td>
                      <td className="py-2 text-white/60">{new Date(w.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {wallets.length === 0 ? <p className="mt-2 text-sm text-white/50">No wallets yet.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">Recent transactions</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2">Ad</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-white/5">
                      <td className="py-2 pr-4 text-white/60">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-xs">{t.email}</td>
                      <td className="py-2 pr-4">{t.type}</td>
                      <td className="py-2 pr-4">${t.amount.toFixed(2)}</td>
                      <td className="py-2 font-mono text-xs text-white/60">{t.adId || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 ? <p className="mt-2 text-sm text-white/50">No transactions yet.</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
