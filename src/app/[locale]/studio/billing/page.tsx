"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import LocaleLink from "@/components/LocaleLink";
import type { PaymentProviderId } from "@/lib/payments/types";

type Tx = {
  id: string;
  type: string;
  amount: unknown;
  adId: string | null;
  createdAt: string;
  paymentProvider: string | null;
  paymentIntentId: string | null;
};

type CampaignRow = { id: string; name: string; spent: unknown; budget: unknown; status?: string };

type ProviderMeta = { id: PaymentProviderId; enabled: boolean; ready: boolean };

type PendingIntentRow = {
  id: string;
  amount: unknown;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
};

function intentStatusLabel(status: string): string {
  if (status === "SUCCEEDED") return "Completed";
  if (status === "FAILED") return "Failed";
  if (status === "PROCESSING") return "Processing";
  return "Pending";
}

const QUICK_AMOUNTS = [100, 250, 500, 1000] as const;

const PROVIDERS: {
  id: PaymentProviderId;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "cashier",
    title: "Cashier",
    description: "Bank transfer or hosted cashier checkout",
    Icon: Landmark,
  },
  {
    id: "paymob",
    title: "Paymob",
    description: "Cards and wallets popular in Egypt",
    Icon: CreditCard,
  },
  {
    id: "stripe",
    title: "Stripe",
    description: "International cards and digital wallets",
    Icon: CreditCard,
  },
  {
    id: "mock",
    title: "Mock",
    description: "Local test flow — no real charge",
    Icon: Sparkles,
  },
];

function methodLabel(provider: string | null, type: string): string {
  if (provider === "stripe") return "Stripe";
  if (provider === "paymob") return "Paymob";
  if (provider === "cashier") return "Cashier";
  if (provider === "mock") return "Mock";
  if (provider === "studio_direct") return "Studio (instant)";
  if (type === "CAMPAIGN_ALLOC") return "Campaign budget";
  if (type === "IMPRESSION" || type === "CLICK" || type === "LEAD") return "Ads delivery";
  return "Wallet";
}

function txStatus(type: string): string {
  return type === "RECHARGE" ? "Completed" : "Posted";
}

function isMockProvider(id: PaymentProviderId): boolean {
  return id === "mock";
}

export default function StudioBillingPage() {
  const params = useParams();
  const locale = String(params.locale ?? "en");

  const [data, setData] = React.useState<{
    profile: { balance?: unknown } | null;
    campaigns: CampaignRow[];
    wallet?: { balance?: unknown; totalSpent?: unknown };
    totalCampaignSpend?: unknown;
    transactions?: Tx[];
    paymentConfig?: { defaultProvider?: PaymentProviderId; providers?: ProviderMeta[] };
    pendingPaymentIntents?: PendingIntentRow[];
    lastRechargeAt?: string | null;
  }>({ profile: null, campaigns: [] });

  const [analytics, setAnalytics] = React.useState<{ rows: unknown[]; summary: Record<string, unknown> | null }>({
    rows: [],
    summary: null,
  });
  const [amount, setAmount] = React.useState("500");
  const [provider, setProvider] = React.useState<PaymentProviderId>("mock");
  const [addOpen, setAddOpen] = React.useState(false);
  const [checkoutStep, setCheckoutStep] = React.useState<"form" | "confirm">("form");
  const [agreeTerms, setAgreeTerms] = React.useState(false);
  const [payLoading, setPayLoading] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  const closeAddModal = React.useCallback(() => {
    setAddOpen(false);
    setCheckoutStep("form");
    setAgreeTerms(false);
    setPayLoading(false);
  }, []);

  const load = React.useCallback(async () => {
    const [billingRes, analyticsRes] = await Promise.all([
      fetch("/api/studio/billing", { credentials: "include" }),
      fetch("/api/studio/ads/analytics", { credentials: "include" }),
    ]);
    const j = (await billingRes.json().catch(() => ({}))) as Partial<{
      profile: { balance?: unknown } | null;
      campaigns: unknown;
      wallet?: { balance?: unknown; totalSpent?: unknown };
      totalCampaignSpend?: unknown;
      transactions?: Tx[];
      paymentConfig?: { defaultProvider?: PaymentProviderId; providers?: ProviderMeta[] };
      pendingPaymentIntents?: PendingIntentRow[];
      lastRechargeAt?: string | null;
    }>;
    setData({
      profile: j.profile ?? null,
      campaigns: Array.isArray(j.campaigns) ? (j.campaigns as CampaignRow[]) : [],
      wallet: j.wallet,
      totalCampaignSpend: j.totalCampaignSpend,
      transactions: j.transactions,
      paymentConfig: j.paymentConfig,
      pendingPaymentIntents: j.pendingPaymentIntents,
      lastRechargeAt: j.lastRechargeAt ?? null,
    });
    setAnalytics(await analyticsRes.json().catch(() => ({ rows: [], summary: null })));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const d = data.paymentConfig?.defaultProvider;
    if (d === "cashier" || d === "paymob" || d === "stripe" || d === "mock") {
      setProvider(d);
    }
  }, [data.paymentConfig?.defaultProvider]);

  React.useEffect(() => {
    const list = data.paymentConfig?.providers;
    if (!list?.length) return;
    setProvider((cur) => {
      const m = list.find((p) => p.id === cur);
      if (m?.ready) return cur;
      const pick = list.find((p) => p.ready);
      return pick?.id ?? cur;
    });
  }, [data.paymentConfig?.providers]);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  React.useEffect(() => {
    if (!addOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [addOpen]);

  const numAmount = Number(amount);
  const proceedDisabled = !Number.isFinite(numAmount) || numAmount <= 0;

  const providerMeta = data.paymentConfig?.providers?.find((p) => p.id === provider);
  const providerReady = providerMeta?.ready === true;

  const goToConfirm = () => {
    if (proceedDisabled) {
      setToast({ type: "err", text: "Enter an amount greater than zero." });
      return;
    }
    if (!provider) {
      setToast({ type: "err", text: "Select a payment method." });
      return;
    }
    if (!providerReady && !isMockProvider(provider)) {
      setToast({
        type: "err",
        text: "Payment provider not configured",
      });
      return;
    }
    setCheckoutStep("confirm");
    setAgreeTerms(false);
  };

  const executePayment = async () => {
    if (proceedDisabled || (!providerReady && !isMockProvider(provider)) || !agreeTerms) return;
    setPayLoading(true);
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, provider, locale }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; redirectUrl?: string };
      if (!res.ok || !j.redirectUrl) {
        setToast({ type: "err", text: j.error || "Could not start payment" });
        setPayLoading(false);
        return;
      }
      setToast({ type: "ok", text: "Redirecting to secure payment…" });
      window.location.assign(j.redirectUrl);
    } catch {
      setToast({ type: "err", text: "Network error" });
      setPayLoading(false);
    }
  };

  const bal = Number(data.wallet?.balance ?? data.profile?.balance ?? 0);
  const totalSpent = Number(data.wallet?.totalSpent ?? 0);
  const campaignSpendTotal = Number(data.totalCampaignSpend ?? 0);
  const lastRecharge = data.lastRechargeAt
    ? new Date(data.lastRechargeAt).toLocaleString()
    : "—";

  const mergedActivity = React.useMemo(() => {
    const intents = (data.pendingPaymentIntents ?? []).map((pi) => ({
      sortKey: new Date(pi.createdAt).getTime(),
      kind: "intent" as const,
      id: pi.id,
      createdAt: pi.createdAt,
      amount: Number(pi.amount),
      status: intentStatusLabel(pi.status),
      method: methodLabel(pi.provider, "RECHARGE"),
    }));
    const txs = (data.transactions ?? []).map((t) => ({
      sortKey: new Date(t.createdAt).getTime(),
      kind: "wallet" as const,
      id: t.id,
      createdAt: t.createdAt,
      amount: Number(t.amount),
      status: txStatus(t.type),
      method: methodLabel(t.paymentProvider, t.type),
      type: t.type,
    }));
    return [...intents, ...txs].sort((a, b) => b.sortKey - a.sortKey).slice(0, 50);
  }, [data.pendingPaymentIntents, data.transactions]);

  const selectedProviderTitle = PROVIDERS.find((p) => p.id === provider)?.title ?? provider;
  const allowSelectedProvider = providerReady || isMockProvider(provider);

  return (
    <div className="space-y-8 pb-10">
      {toast ? (
        <div
          role="status"
          className={`fixed right-4 top-20 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl transition-all duration-300 sm:right-8 ${
            toast.type === "ok"
              ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-50"
              : "border-red-500/40 bg-red-950/90 text-red-50"
          }`}
          style={{ animation: "billingToastIn 0.35s ease-out both" }}
        >
          {toast.text}
        </div>
      ) : null}
      <style jsx global>{`
        @keyframes billingToastIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Billing</h1>
        <p className="mt-1 text-sm text-white/50">Wallet, top-ups, and campaign analytics</p>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-white/[0.06] to-white/[0.02] p-6 shadow-[0_24px_80px_-32px_rgba(99,102,241,0.45)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/55">Current balance</p>
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
              {bal.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              <span className="text-2xl font-semibold text-white/70 sm:text-3xl">EGP</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setCheckoutStep("form");
                setAgreeTerms(false);
                setAddOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add balance
            </button>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/45">Total spent (wallet)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                {totalSpent.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/45">Last recharge</p>
              <p className="mt-1 text-sm font-medium text-white/90">{lastRecharge}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs text-white/45">Campaign delivery spend (from campaign budgets)</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-white/85">
                {campaignSpendTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP
              </p>
            </div>
          </div>
        </div>
      </section>

      {addOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#141418] shadow-2xl sm:rounded-2xl"
            style={{ animation: "billingModalIn 0.3s ease-out both" }}
            role="dialog"
            aria-modal
            aria-labelledby="add-balance-title"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 id="add-balance-title" className="text-lg font-semibold text-white">
                Add balance
              </h2>
              <button
                type="button"
                onClick={() => closeAddModal()}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {checkoutStep === "form" ? (
                <>
                  <div>
                    <label htmlFor="topup-amount" className="text-sm font-medium text-white/70">
                      Amount (EGP)
                    </label>
                    <input
                      id="topup-amount"
                      className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-lg font-semibold text-white outline-none ring-0 transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30"
                      type="number"
                      min={1}
                      step={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {QUICK_AMOUNTS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                          onClick={() => setAmount(String(n))}
                        >
                          {n} EGP
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white/70">Payment method</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {PROVIDERS.map(({ id, title, description, Icon }) => {
                        const active = provider === id;
                        const meta = data.paymentConfig?.providers?.find((p) => p.id === id);
                        const ready = meta?.ready === true || id === "mock";
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={!ready}
                            onClick={() => ready && setProvider(id)}
                            className={`flex gap-3 rounded-xl border p-4 text-left transition ${
                              !ready ? "cursor-not-allowed opacity-45" : ""
                            } ${
                              active
                                ? "border-indigo-500/70 bg-indigo-500/15 ring-2 ring-indigo-500/30"
                                : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]"
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                active ? "bg-indigo-500/30 text-indigo-200" : "bg-white/10 text-white/70"
                              }`}
                            >
                              <Icon className="h-5 w-5" aria-hidden />
                            </span>
                            <span>
                              <span className="block font-semibold text-white">{title}</span>
                              <span className="mt-0.5 block text-xs leading-snug text-white/50">{description}</span>
                              {!ready ? (
                                <span className="mt-1 block text-xs text-amber-200/80">
                                  Setup required
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={proceedDisabled || payLoading || !allowSelectedProvider}
                    onClick={() => goToConfirm()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-900/35 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {allowSelectedProvider ? "Proceed to payment" : "Setup required"}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white/85">
                    <p>
                      <span className="text-white/50">Amount</span>{" "}
                      <span className="font-semibold text-white">
                        {numAmount.toLocaleString()} EGP
                      </span>
                    </p>
                    <p className="mt-2">
                      <span className="text-white/50">Payment method</span>{" "}
                      <span className="font-semibold text-white">{selectedProviderTitle}</span>
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-white/75">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-1 rounded border-white/20"
                    />
                    <span>I agree to the terms and conditions</span>
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={payLoading}
                      onClick={() => {
                        setCheckoutStep("form");
                        setAgreeTerms(false);
                      }}
                      className="flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!agreeTerms || payLoading || proceedDisabled || !allowSelectedProvider}
                      onClick={() => void executePayment()}
                      className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-900/35 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {payLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                          Starting checkout…
                        </>
                      ) : (
                        "Confirm payment"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes billingModalIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg sm:p-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-white/50" />
          <h2 className="text-lg font-semibold text-white">Transactions</h2>
        </div>
        {mergedActivity.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">No transactions yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {mergedActivity.map((row) => {
                  const amt = row.amount;
                  const isIntent = row.kind === "intent";
                  const isCredit = isIntent || (row.kind === "wallet" && row.type === "RECHARGE");
                  return (
                    <tr
                      key={isIntent ? `pi-${row.id}` : row.id}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 text-white/70">{new Date(row.createdAt).toLocaleString()}</td>
                      <td
                        className={`px-4 py-3 font-medium tabular-nums ${isCredit ? "text-emerald-400" : "text-white/85"}`}
                      >
                        {isCredit ? "+" : "−"}
                        {amt.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP
                      </td>
                      <td className="px-4 py-3 text-white/75">{row.status}</td>
                      <td className="px-4 py-3 text-white/60">{row.method}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Campaign spend</h2>
        <div className="mt-3 space-y-2">
          {(data.campaigns || []).map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/85">
              {c.name} — spent {Number(c.spent || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} /{" "}
              {Number(c.budget || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Performance</h2>
        {analytics.summary ? (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white/80">
              Impr: {String(analytics.summary.impressions ?? "—")}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white/80">
              Views: {String(analytics.summary.views ?? "—")}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white/80">
              Clicks: {String(analytics.summary.clicks ?? "—")}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white/80">
              Leads: {String(analytics.summary.leads ?? "—")}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white/80">
              CPL: {Number(analytics.summary.costPerLead || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              EGP
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/45">No analytics yet.</p>
        )}
        <p className="mt-4 text-center text-xs text-white/35">
          Need help?{" "}
          <LocaleLink href="/studio/campaigns" className="text-indigo-400 hover:text-indigo-300">
            Manage campaigns
          </LocaleLink>
        </p>
      </section>
    </div>
  );
}
