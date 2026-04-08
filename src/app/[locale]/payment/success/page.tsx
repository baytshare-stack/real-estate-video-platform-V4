"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import LocaleLink from "@/components/LocaleLink";

type Summary = {
  status: string;
  amount: number;
  currency: string;
  provider: string;
  newBalance: number;
};

function SuccessInner() {
  const searchParams = useSearchParams();
  const intentId = searchParams.get("intentId");
  const token = searchParams.get("token");

  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!intentId || !token) {
      setError("Invalid return link");
      return;
    }

    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      const res = await fetch(
        `/api/payments/summary?intentId=${encodeURIComponent(intentId)}&token=${encodeURIComponent(token)}`
      );
      if (cancelled) return;
      if (!res.ok) {
        setError("Could not load payment details");
        return;
      }
      const data = (await res.json()) as Summary;
      if (data.status === "SUCCEEDED") {
        setSummary(data);
        return;
      }
      tries += 1;
      if (tries < 12) {
        setTimeout(poll, 800);
      } else {
        setError("Payment is still processing. Check billing in a moment.");
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [intentId, token]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-white">
        <p className="text-white/70">{error}</p>
        <LocaleLink
          href="/studio/billing"
          className="mt-6 inline-block rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15"
        >
          Back to billing
        </LocaleLink>
      </div>
    );
  }

  if (!summary || summary.status !== "SUCCEEDED") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-white/70">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        <p className="text-sm">Confirming your payment…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div
        className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-white/[0.03] p-8 text-center shadow-[0_24px_80px_-28px_rgba(16,185,129,0.35)]"
        style={{ animation: "successPop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Payment successful</h1>
        <p className="mt-3 text-lg text-white/85">
          <span className="text-white/50">Added</span>{" "}
          <span className="font-semibold text-white">
            {summary.amount.toLocaleString()} {summary.currency}
          </span>
        </p>
        <p className="mt-2 text-sm text-white/55">
          New balance:{" "}
          <span className="font-semibold text-emerald-200/90">
            {summary.newBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {summary.currency}
          </span>
        </p>
        <p className="mt-1 text-xs capitalize text-white/35">via {summary.provider}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <LocaleLink
            href="/studio"
            className="inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15"
          >
            Back to dashboard
          </LocaleLink>
          <LocaleLink
            href="/studio/campaigns"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500"
          >
            Create campaign
          </LocaleLink>
        </div>
      </div>
      <style jsx global>{`
        @keyframes successPop {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function Fallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-white/40" />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <SuccessInner />
    </Suspense>
  );
}
