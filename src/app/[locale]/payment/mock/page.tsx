"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { postWalletPaymentComplete } from "@/lib/payments/complete-fetch";

function MockPaymentInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = String(params.locale ?? "en");

  const intentId = searchParams.get("intentId");
  const token = searchParams.get("token");

  React.useEffect(() => {
    if (!intentId || !token) {
      router.replace(
        `/${locale}/payment/failed?reason=${encodeURIComponent("Missing payment session")}`
      );
      return;
    }

    const run = setTimeout(() => {
      void (async () => {
        const out = await postWalletPaymentComplete(intentId, token);
        if (out.ok) {
          router.replace(
            `/${locale}/payment/success?intentId=${encodeURIComponent(intentId)}&token=${encodeURIComponent(token)}`
          );
        } else {
          router.replace(
            `/${locale}/payment/failed?reason=${encodeURIComponent(out.error)}`
          );
        }
      })();
    }, 2000);

    return () => clearTimeout(run);
  }, [intentId, token, locale, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-500"
        style={{ animation: "paymentCardIn 0.45s ease-out both" }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Simulating secure payment…</h1>
        <p className="mt-2 text-sm text-white/60">Please wait while we confirm your session.</p>
        <p className="mt-6 text-xs text-white/40">Test mode — no real charge</p>
      </div>
      <style jsx global>{`
        @keyframes paymentCardIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function Fallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-white/60">
      <Loader2 className="h-10 w-10 animate-spin" />
    </div>
  );
}

export default function PaymentMockPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <MockPaymentInner />
    </Suspense>
  );
}
