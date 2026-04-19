"use client";

import * as React from "react";
import { Loader2, Megaphone, Pause, Pencil, Play, Square, Trash2 } from "lucide-react";
import LocaleLink from "@/components/LocaleLink";
import { StudioAdsPageHeader } from "@/components/studio/ads/StudioAdsBreadcrumb";
import { AdsLifecycleBadge } from "@/components/studio/ads/AdsLifecycleBadge";
import { StudioConfirmDialog } from "@/components/studio/ads/StudioConfirmDialog";
import { parseResponseJson } from "@/lib/ads-client/safe-json";
import { type StudioBillingWire } from "@/lib/ads-platform/monetization-engine";

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

/** Map API/DB billing value to Studio wire label (unknown → CBC per product default). */
function billingTypeToWireLabel(raw: unknown): StudioBillingWire {
  const u = String(raw ?? "").trim().toUpperCase();
  if (u === "CPM") return "CPM";
  if (u === "CPL") return "CPL";
  if (u === "CPC" || u === "CBC") return "CBC";
  return "CBC";
}

type MonetizationSummary = {
  impressions: number;
  clicks: number;
  leads: number;
  spend: number;
  cpcActual: number | null;
  cplActual: number | null;
  cpmActual: number | null;
  roiLeadEstimate: number | null;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  budget?: unknown;
  dailyBudget?: unknown;
  spent?: unknown;
  billingType?: string;
  bidAmount?: unknown;
  startDate?: string;
  endDate?: string;
  monetization?: MonetizationSummary;
  _count?: { ads?: number }; // legacy shape; video inventory is no longer per-campaign
};

function CampaignToolbar({
  c,
  patchCampaign,
  openEdit,
  setConfirm,
  compact,
}: {
  c: CampaignRow;
  patchCampaign: (id: string, body: Record<string, unknown>) => Promise<void>;
  openEdit: (c: CampaignRow) => void;
  setConfirm: (v: null | { kind: "end" | "delete"; id: string }) => void;
  compact?: boolean;
}) {
  const deleted = c.status === "DELETED";
  const ended = c.status === "ENDED";
  const terminal = deleted || ended;
  const btn = compact
    ? "rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white hover:bg-white/5"
    : "inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-35";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn} disabled={deleted} onClick={() => openEdit(c)} title="Edit">
        <span className="inline-flex items-center gap-1">
          <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {!compact ? "Edit" : null}
        </span>
      </button>
      {(c.status === "DRAFT" || c.status === "PAUSED") && !terminal ? (
        <button
          type="button"
          className={btn}
          onClick={() => void patchCampaign(c.id, { status: "ACTIVE" })}
        >
          <span className="inline-flex items-center gap-1">
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {!compact ? (c.status === "DRAFT" ? "Activate" : "Resume") : null}
          </span>
        </button>
      ) : null}
      {c.status === "ACTIVE" && !terminal ? (
        <button type="button" className={btn} onClick={() => void patchCampaign(c.id, { status: "PAUSED" })}>
          <span className="inline-flex items-center gap-1">
            <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {!compact ? "Pause" : null}
          </span>
        </button>
      ) : null}
      {!terminal ? (
        <button type="button" className={btn} onClick={() => setConfirm({ kind: "end", id: c.id })}>
          <span className="inline-flex items-center gap-1">
            <Square className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {!compact ? "End" : null}
          </span>
        </button>
      ) : null}
      {!deleted ? (
        <button
          type="button"
          className={btn}
          onClick={() => setConfirm({ kind: "delete", id: c.id })}
          title="Delete campaign"
        >
          <span className="inline-flex items-center gap-1 text-rose-200">
            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {!compact ? "Delete" : null}
          </span>
        </button>
      ) : null}
    </div>
  );
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
  const [billingType, setBillingType] = React.useState<StudioBillingWire>("CPM");
  const [campaignError, setCampaignError] = React.useState("");
  const [creatingCampaign, setCreatingCampaign] = React.useState(false);
  const [confirm, setConfirm] = React.useState<null | { kind: "end" | "delete"; id: string }>(null);
  const [edit, setEdit] = React.useState<null | {
    id: string;
    name: string;
    budget: string;
    dailyBudget: string;
    billingType: StudioBillingWire;
    startDate: string;
    endDate: string;
  }>(null);

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

  const createCampaign = React.useCallback(async () => {
    setCampaignError("");
    const budgetNum = Number(String(budget).replace(/,/g, "").trim());
    const dailyNum = Number(String(dailyBudget).replace(/,/g, "").trim());

    if (!name.trim()) {
      const msg = "Campaign name is required.";
      console.warn("[studio/campaigns UI] validation", msg);
      setCampaignError(msg);
      return;
    }
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      const msg = "Enter a valid total budget greater than zero.";
      console.warn("[studio/campaigns UI] validation", msg, { budget });
      setCampaignError(msg);
      return;
    }

    const payload = {
      name: name.trim(),
      budget: budgetNum,
      dailyBudget: Number.isFinite(dailyNum) ? dailyNum : 0,
      billingType,
    };

    console.log("API CALL STARTING", "/api/studio/campaigns", payload);
    setCreatingCampaign(true);
    try {
      const res = await fetch("/api/studio/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await parseResponseJson(
        res,
        {} as { success?: boolean; error?: string; detail?: string; code?: string }
      );
      console.log("API CALL FINISHED", res.status, res.ok, j);
      if (res.ok && j.success !== false) {
        setName("");
        setBillingType("CPM");
        await load();
      } else {
        const parts = [j.error, j.detail].filter((x): x is string => typeof x === "string" && x.length > 0);
        const msg = parts.length ? parts.join(" — ") : `Could not create campaign (${res.status}).`;
        setCampaignError(msg);
        console.warn("[studio/campaigns UI] API error response", res.status, j);
      }
    } catch (err) {
      console.error("[studio/campaigns UI] create campaign fetch failed", err);
      setCampaignError(err instanceof Error ? err.message : "Network error. Check your connection and try again.");
    } finally {
      setCreatingCampaign(false);
    }
  }, [name, budget, dailyBudget, billingType, load]);

  const onNewCampaignSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log("FORM SUBMIT TRIGGERED");
      await createCampaign();
    },
    [createCampaign]
  );

  const patchCampaign = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/studio/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await load();
  };

  const openEdit = (c: {
    id: string;
    name: string;
    budget?: unknown;
    dailyBudget?: unknown;
    billingType?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const sd = typeof c.startDate === "string" ? c.startDate.slice(0, 10) : "";
    const ed = typeof c.endDate === "string" ? c.endDate.slice(0, 10) : "";
    const billing = billingTypeToWireLabel(c.billingType);
    setEdit({
      id: c.id,
      name: c.name,
      budget: String(n(c.budget)),
      dailyBudget: String(n(c.dailyBudget)),
      billingType: billing,
      startDate: sd,
      endDate: ed,
    });
  };

  const saveEdit = async () => {
    if (!edit) return;
    await patchCampaign(edit.id, {
      name: edit.name.trim(),
      budget: Number(edit.budget),
      dailyBudget: Number(edit.dailyBudget),
      billingType: edit.billingType,
      startDate: edit.startDate,
      endDate: edit.endDate,
    });
    setEdit(null);
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
          <form className="mt-4 space-y-4" onSubmit={onNewCampaignSubmit} noValidate>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-white/65">
                Campaign name
                <input
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  placeholder="Spring listings"
                  name="campaignName"
                  autoComplete="off"
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
                  name="totalBudget"
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
                  name="dailyBudget"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                />
              </label>
              <label className="text-xs text-white/65 md:col-span-1">
                Billing model
                <select
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  name="billingType"
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as StudioBillingWire)}
                >
                  <option value="CPM">Cost Per 1000 Impressions (CPM)</option>
                  <option value="CBC">Cost Per Click (CBC)</option>
                  <option value="CPL">Cost Per Lead (CPL)</option>
                </select>
              </label>
              <p className="text-xs text-white/50 md:col-span-2 md:self-end">
                Per-impression, click, and lead prices are set automatically from your total and daily budgets (no manual
                bid entry).
              </p>
            </div>
            {campaignError ? (
              <p className="text-sm text-rose-300" role="alert">
                {campaignError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={creatingCampaign}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              onClick={() => console.log("CREATE CAMPAIGN CLICKED")}
            >
              {creatingCampaign ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating…
                </span>
              ) : (
                "Create campaign"
              )}
            </button>
          </form>
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
                const mon = (c as CampaignRow).monetization;
                const roiPct =
                  mon?.roiLeadEstimate != null && Number.isFinite(mon.roiLeadEstimate)
                    ? mon.roiLeadEstimate * 100
                    : null;
                return (
                  <article
                    key={c.id}
                    className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-black/35 to-black/20 p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{c.name}</h3>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
                          <span>
                            {billingTypeToWireLabel((c as CampaignRow).billingType)}
                            {" · Auto bid · "}
                          </span>
                          <span>Studio Ads use campaign budgets · </span>
                          <AdsLifecycleBadge status={String(c.status || "DRAFT")} />
                        </p>
                      </div>
                      <CampaignToolbar
                        c={c as CampaignRow}
                        patchCampaign={patchCampaign}
                        openEdit={openEdit}
                        setConfirm={setConfirm}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="Impressions" value={formatInt(m.impr)} />
                      <Metric label="Clicks" value={formatInt(m.clk)} />
                      <Metric label="CTR" value={`${ctr.toFixed(2)}%`} accent />
                      <Metric label="Daily cap" value={formatInt(n(c.dailyBudget))} />
                      <Metric
                        label="Act. CPC"
                        value={mon?.cpcActual != null ? `$${mon.cpcActual.toFixed(3)}` : "—"}
                      />
                      <Metric
                        label="Act. CPL"
                        value={mon?.cplActual != null ? `$${mon.cplActual.toFixed(2)}` : "—"}
                      />
                      <Metric
                        label="ROI est."
                        value={roiPct != null ? `${roiPct.toFixed(1)}%` : "—"}
                      />
                      <Metric
                        label="Spend tracked"
                        value={mon?.spend != null ? `$${mon.spend.toFixed(2)}` : "—"}
                      />
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
                const monM = (c as CampaignRow).monetization;
                return (
                  <article key={c.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white">{c.name}</h3>
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-200">
                        CTR {ctr.toFixed(2)}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">
                      {billingTypeToWireLabel((c as CampaignRow).billingType)}
                      {monM?.cpcActual != null ? ` · CPC $${monM.cpcActual.toFixed(3)}` : ""}
                      {monM?.cplActual != null ? ` · CPL $${monM.cplActual.toFixed(2)}` : ""}
                    </p>
                    <p className="mt-1">
                      <AdsLifecycleBadge status={String(c.status || "DRAFT")} />
                    </p>
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
                    <div className="mt-3">
                      <CampaignToolbar
                        c={c as CampaignRow}
                        patchCampaign={patchCampaign}
                        openEdit={openEdit}
                        setConfirm={setConfirm}
                        compact
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <StudioConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "delete" ? "Delete this campaign?" : "End this campaign?"}
        message={
          confirm?.kind === "delete"
            ? "The campaign will be marked deleted. This cannot be undone from the UI."
            : "The campaign will end. You can still view history in Studio."
        }
        confirmLabel={confirm?.kind === "delete" ? "Delete" : "End campaign"}
        danger={confirm?.kind === "delete"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          void (async () => {
            await patchCampaign(confirm.id, { status: confirm.kind === "delete" ? "DELETED" : "ENDED" });
            setConfirm(null);
          })();
        }}
      />

      {edit ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-edit-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <h3 id="campaign-edit-title" className="text-lg font-semibold text-white">
              Edit campaign
            </h3>
            <p className="mt-1 text-sm text-white/55">
              Name, budget, schedule, and billing model. Bids stay system-managed from budgets. Budget changes use your
              wallet (same as create).
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-white/65">
                Name
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={edit.name}
                  onChange={(e) => setEdit((s) => (s ? { ...s, name: e.target.value } : s))}
                />
              </label>
              <label className="block text-xs text-white/65">
                Total budget
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  inputMode="decimal"
                  value={edit.budget}
                  onChange={(e) => setEdit((s) => (s ? { ...s, budget: e.target.value } : s))}
                />
              </label>
              <label className="block text-xs text-white/65">
                Daily budget
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  inputMode="decimal"
                  value={edit.dailyBudget}
                  onChange={(e) => setEdit((s) => (s ? { ...s, dailyBudget: e.target.value } : s))}
                />
              </label>
              <label className="block text-xs text-white/65">
                Billing model
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={edit.billingType}
                  onChange={(e) =>
                    setEdit((s) =>
                      s ? { ...s, billingType: e.target.value as StudioBillingWire } : s
                    )
                  }
                >
                  <option value="CPM">Cost Per 1000 Impressions (CPM)</option>
                  <option value="CBC">Cost Per Click (CBC)</option>
                  <option value="CPL">Cost Per Lead (CPL)</option>
                </select>
              </label>
              <p className="text-xs text-white/45">
                Saving recalculates internal bids from your budgets and dates (no manual bid field).
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-white/65">
                  Start date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={edit.startDate}
                    onChange={(e) => setEdit((s) => (s ? { ...s, startDate: e.target.value } : s))}
                  />
                </label>
                <label className="block text-xs text-white/65">
                  End date
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={edit.endDate}
                    onChange={(e) => setEdit((s) => (s ? { ...s, endDate: e.target.value } : s))}
                  />
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5"
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                onClick={() => void saveEdit()}
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

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${accent ? "text-emerald-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
