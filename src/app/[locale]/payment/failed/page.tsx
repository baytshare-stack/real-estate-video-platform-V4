"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import LocaleLink from "@/components/LocaleLink";

function FailedInner() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "Something went wrong";

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div
        className="rounded-2xl border border-red-500/25 bg-gradient-to-b from-red-500/10 to-white/[0.03] p-8 text-center shadow-[0_24px_80px_-28px_rgba(239,68,68,0.25)]"
        style={{ animation: "failShake 0.55s ease-out both" }}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
          <XCircle className="h-10 w-10 text-red-400" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Payment failed</h1>
        <p className="mt-3 text-sm text-white/60">{reason}</p>
        <LocaleLink
          href="/studio/billing"
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15 sm:w-auto"
        >
          Try again
        </LocaleLink>
      </div>
      <style jsx global>{`
        @keyframes failShake {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function Fallback() {
  return <div className="min-h-[30vh]" />;
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <FailedInner />
    </Suspense>
  );
}
