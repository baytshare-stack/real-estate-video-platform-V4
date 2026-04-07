"use client";

import * as React from "react";
import { Loader2, Megaphone, Pause, Play, Square } from "lucide-react";
import LocaleLink from "@/components/LocaleLink";
import { StudioAdsPageHeader } from "@/components/studio/ads/StudioAdsBreadcrumb";

type AdRow = {
  campaignId: string;
  performance?: { impressions?: number; clicks?: number };
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function ctrPct(impressions: number, clicks: number): number {
  if (impressions <= 0) return 0;
  return (clicks / impressions) * 100;
}

function formatInt(x: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(x);
}

export default function StudioCampaignsPage() {
  const [onboarding, setOnboarding] = React.useState<{ businessName?: string; balance?: unknown } | null>(null);
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [ads, setAds] = React.useState<AdRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [businessName, setBusinessName] = React.useState("");
  const [name, setName] = React.useState("");
  const [budget, setBudget] = React.useState("1000");
  const [dailyBudget, setDailyBudget] = React.useState("50");

  const metricsByCampaign = React.useMemo(() => {
    const m = new Map<string, { impr: number; clk: number }>();
    for (const a of ads) {
      const id = a.campaignId;
      if (!id) continue;
      const cur = m.get(id) || { impr: 0, clk: 0 };
      cur.impr += n(a.performance?.impressions);
      cur.clk += n(a.performance?.clicks);
      m.set(id, cur);
    }
    return m;
  }, [ads]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [o, c, adRes] = await Promise.all([
        fetch("/api/studio/ads/onboarding"),
        fetch("/api/studio/campaigns"),
        fetch("/api/studio/ads"),
      ]);
      const od = await o.json().catch(() => ({}));
      const cd = await c.json().catch(() => ({}));
      const adData = await adRes.json().catch(() => ({}));
      setOnboarding(od.profile || null);
      setCampaigns(cd.campaigns || []);
      setAds(adData.ads || []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createOnboarding = async () => {
    const res = await fetch("/api/studio/ads/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName }),
    });
    if (res.ok) await load();
  };

  const createCampaign = async () => {
    const res = await fetch("/api/studio/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, budget: Number(budget), dailyBudget: Number(dailyBudget) }),
    });
    if (res.ok) {
      setName("");
      await load();
    }
  };

  const setStatus = async (id: string, status: "ACTIVE" | "PAUSED" | "ENDED") => {
    const res = await fetch(`/api/studio/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <StudioAdsPageHeader
        segment="campaigns"
        title="Campaigns"
        subtitle="Budgets, delivery status, and rolled-up performance across your ads."
      />

      <div className="flex flex-wrap gap-2">
        <LocaleLink
          href="/studio/ads"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/25 transition hover:bg-indigo-500"
        >
          <Megaphone className="h-4 w-4" aria-hidden />
          Manage ads
        </LocaleLink>
      </div>

      {!onboarding ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Advertiser onboarding</h2>
          <p className="mt-1 text-sm text-white/55">Create your advertiser profile to run campaigns.</p>
          <div className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs text-white/65">
              Business name
              <input
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                placeholder="Your brand"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
              onClick={() => void createOnboarding()}
            >
              Create profile
            </button>
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          <span className="font-semibold text-white">{onboarding.businessName}</span>
          <span className="text-white/60"> · Balance </span>
          <span className="tabular-nums font-medium">${n(onboarding.balance).toFixed(2)}</span>
        </div>
      )}

      {onboarding ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">New campaign</h2>
          <p className="mt-1 text-sm text-white/55">Total and daily caps — same rules as before, clearer labels.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-xs text-white/65">
              Campaign name
              <input
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                placeholder="Spring listings"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="text-xs text-white/65">
              Total budget
              <span className="mb-1 block text-[10px] font-normal text-white/40">Lifetime spend cap for this campaign</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
            <label className="text-xs text-white/65">
              Daily budget
              <span className="mb-1 block text-[10px] font-normal text-white/40">Maximum spend per day</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                inputMode="decimal"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            onClick={() => void createCampaign()}
          >
            Create campaign
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Campaign overview</h2>
        <p className="mt-1 text-sm text-white/55">CTR and delivery stats aggregate all ads in each campaign.</p>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : campaigns.length === 0 ? (
          <p className="mt-8 text-sm text-white/50">No campaigns yet.</p>
        ) : (
          <>
            <div className="mt-6 hidden gap-4 lg:grid lg:grid-cols-2">
              {campaigns.map((c) => {
                const bud = n(c.budget);
                const spent = n(c.spent);
                const rem = Math.max(0, bud - spent);
                const pct = bud > 0 ? Math.min(100, (spent / bud) * 100) : 0;
                const m = metricsByCampaign.get(c.id) || { impr: 0, clk: 0 };
                const ctr = ctrPct(m.impr, m.clk);
                const adCount = n(c._count?.ads);
                return (
                  <article
                    key={c.id}
                    className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-black/35 to-black/20 p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{c.name}</h3>
                        <p className="mt-1 text-xs text-white/45">
                          {adCount} ad{adCount === 1 ? "" : "s"} ·{" "}
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">{c.status}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                          onClick={() => void setStatus(c.id, "ACTIVE")}
                        >
                          <Play className="h-3.5 w-3.5" aria-hidden /> Run
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                          onClick={() => void setStatus(c.id, "PAUSED")}
                        >
                          <Pause className="h-3.5 w-3.5" aria-hidden /> Pause
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                          onClick={() => void setStatus(c.id, "ENDED")}
                        >
                          <Square className="h-3.5 w-3.5" aria-hidden /> End
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="Impressions" value={formatInt(m.impr)} />
                      <Metric label="Clicks" value={formatInt(m.clk)} />
                      <Metric label="CTR" value={`${ctr.toFixed(2)}%`} accent />
                      <Metric label="Daily cap" value={formatInt(n(c.dailyBudget))} />
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-white/55">
                        <span>Budget progress</span>
                        <span className="tabular-nums">
                          {formatInt(spent)} / {formatInt(bud)}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-indigo-200/90">
                        Remaining budget: <span className="tabular-nums font-medium">{formatInt(rem)}</span>
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 space-y-4 lg:hidden">
              {campaigns.map((c) => {
                const bud = n(c.budget);
                const spent = n(c.spent);
                const rem = Math.max(0, bud - spent);
                const pct = bud > 0 ? Math.min(100, (spent / bud) * 100) : 0;
                const m = metricsByCampaign.get(c.id) || { impr: 0, clk: 0 };
                const ctr = ctrPct(m.impr, m.clk);
                return (
                  <article key={c.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white">{c.name}</h3>
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-200">
                        CTR {ctr.toFixed(2)}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">{c.status}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-white/45">Impressions</p>
                        <p className="tabular-nums">{formatInt(m.impr)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-white/45">Clicks</p>
                        <p className="tabular-nums">{formatInt(m.clk)}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-white/55">
                        <span>Budget</span>
                        <span className="tabular-nums">
                          {formatInt(spent)} / {formatInt(bud)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-indigo-200/90">Remaining: {formatInt(rem)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white"
                        onClick={() => void setStatus(c.id, "ACTIVE")}
                      >
                        Run
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white"
                        onClick={() => void setStatus(c.id, "PAUSED")}
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white"
                        onClick={() => void setStatus(c.id, "ENDED")}
                      >
                        End
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${accent ? "text-emerald-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
