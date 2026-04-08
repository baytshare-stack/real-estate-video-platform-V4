"use client";

import * as React from "react";
import Link from "next/link";
import type { PaymentProviderId } from "@/lib/payments/types";

type Row = {
  id: PaymentProviderId;
  enabled: boolean;
  publicKey: string;
  callbackUrl: string;
  hasSecret: boolean;
};

const LABELS: Record<PaymentProviderId, string> = {
  cashier: "Cashier",
  paymob: "Paymob",
  stripe: "Stripe",
  mock: "Mock (test)",
};

export default function AdminPaymentsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [defaultProvider, setDefaultProvider] = React.useState<PaymentProviderId>("mock");
  const [rows, setRows] = React.useState<Row[]>([]);
  const emptyDraft = (): Record<
    PaymentProviderId,
    { publicKey: string; secretKey: string; callbackUrl: string; clearSecret: boolean }
  > => ({
    cashier: { publicKey: "", secretKey: "", callbackUrl: "", clearSecret: false },
    paymob: { publicKey: "", secretKey: "", callbackUrl: "", clearSecret: false },
    stripe: { publicKey: "", secretKey: "", callbackUrl: "", clearSecret: false },
    mock: { publicKey: "", secretKey: "", callbackUrl: "", clearSecret: false },
  });

  const [draft, setDraft] = React.useState(emptyDraft);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payment-settings", { credentials: "include" });
      if (!res.ok) {
        setError("Could not load settings");
        return;
      }
      const j = (await res.json()) as { defaultProvider: PaymentProviderId; providers: Row[] };
      setDefaultProvider(j.defaultProvider);
      setRows(j.providers);
      const nd = emptyDraft();
      for (const r of j.providers) {
        nd[r.id] = {
          publicKey: r.publicKey,
          secretKey: "",
          callbackUrl: r.callbackUrl,
          clearSecret: false,
        };
      }
      setDraft(nd);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const providers: Record<string, Record<string, unknown>> = {};
      for (const r of rows) {
        const d = draft[r.id];
        const patch: Record<string, unknown> = {
          enabled: r.enabled,
          publicKey: d.publicKey,
          callbackUrl: d.callbackUrl,
        };
        if (d.secretKey.trim().length > 0) patch.secretKey = d.secretKey;
        if (d.clearSecret) patch.clearSecret = true;
        providers[r.id] = patch;
      }
      const res = await fetch("/api/admin/payment-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultProvider, providers }),
      });
      if (!res.ok) {
        setError("Save failed");
        return;
      }
      const j = (await res.json()) as { defaultProvider: PaymentProviderId; providers: Row[] };
      setDefaultProvider(j.defaultProvider);
      setRows(j.providers);
      const nd = emptyDraft();
      for (const r of j.providers) {
        nd[r.id] = {
          publicKey: r.publicKey,
          secretKey: "",
          callbackUrl: r.callbackUrl,
          clearSecret: false,
        };
      }
      setDraft(nd);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const setRowEnabled = (id: PaymentProviderId, enabled: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Payment gateways</h1>
          <p className="mt-1 text-sm text-white/60">
            Enable providers, store API keys server-side, and set the default wallet top-up method.
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="text-sm text-indigo-300 underline-offset-2 hover:text-white hover:underline"
        >
          ← Settings
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <label className="block text-sm font-medium text-white/80">Default provider</label>
        <select
          className="mt-2 w-full max-w-md rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          value={defaultProvider}
          onChange={(e) => setDefaultProvider(e.target.value as PaymentProviderId)}
          disabled={loading}
        >
          {(Object.keys(LABELS) as PaymentProviderId[]).map((id) => (
            <option key={id} value={id}>
              {LABELS[id]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const d = draft[r.id];
            const active = r.enabled;
            return (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{LABELS[r.id]}</h2>
                    <p className="mt-1 text-xs text-white/45">
                      Status:{" "}
                      <span className={active ? "text-emerald-400" : "text-white/50"}>
                        {active ? "Active" : "Inactive"}
                      </span>
                      {r.id !== "mock" ? (
                        <>
                          {" "}
                          · Keys:{" "}
                          <span className={r.hasSecret || d.secretKey ? "text-amber-200/90" : "text-white/45"}>
                            {r.hasSecret || d.secretKey.trim() ? "Secret set" : "No secret"}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setRowEnabled(r.id, e.target.checked)}
                      className="rounded border-white/20"
                    />
                    Enabled
                  </label>
                </div>

                {r.id !== "mock" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-white/50">Public key</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                        value={d.publicKey}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [r.id]: { ...prev[r.id], publicKey: e.target.value },
                          }))
                        }
                        placeholder="Optional"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/50">Secret key</label>
                      <input
                        type="password"
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                        value={d.secretKey}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [r.id]: { ...prev[r.id], secretKey: e.target.value, clearSecret: false },
                          }))
                        }
                        placeholder={r.hasSecret ? "•••••••• (enter new to replace)" : "Required for live mode"}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-white/50">
                        Callback URL (optional template with {"{{amount}}"}, {"{{currency}}"}, {"{{ref}}"})
                      </label>
                      <input
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                        value={d.callbackUrl}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [r.id]: { ...prev[r.id], callbackUrl: e.target.value },
                          }))
                        }
                        placeholder="https://…"
                        autoComplete="off"
                      />
                    </div>
                    {r.hasSecret ? (
                      <label className="flex items-center gap-2 text-xs text-white/60 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={d.clearSecret}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [r.id]: { ...prev[r.id], clearSecret: e.target.checked },
                            }))
                          }
                        />
                        Clear stored secret on save
                      </label>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-white/45">
                    Mock has no keys. Keep enabled for local / QA top-ups.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={saving || loading}
        onClick={() => void save()}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
