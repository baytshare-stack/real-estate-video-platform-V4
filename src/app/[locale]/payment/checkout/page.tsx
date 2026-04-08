"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { postWalletPaymentComplete } from "@/lib/payments/complete-fetch";

function CheckoutInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = String(params.locale ?? "en");
  const intentId = searchParams.get("intentId");
  const token = searchParams.get("token");
  const provider = searchParams.get("provider") || "gateway";

  const [phase, setPhase] = React.useState<"redirect" | "secure">("redirect");

  React.useEffect(() => {
    if (!intentId || !token) {
      router.replace(
        `/${locale}/payment/failed?reason=${encodeURIComponent("Missing payment session")}`
      );
      return;
    }
    const t1 = setTimeout(() => setPhase("secure"), 1200);
    const t2 = setTimeout(() => {
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
    }, 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [intentId, token, locale, router]);

  const title =
    phase === "redirect" ? "Redirecting to secure payment…" : "Processing with payment partner…";

  const sub =
    provider === "stripe"
      ? "Stripe Checkout (simulated)"
      : provider === "paymob"
        ? "Paymob (simulated)"
        : provider === "cashier"
          ? "Cashier / bank redirect (simulated)"
          : "Secure checkout";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-8 text-center shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)]"
        style={{ animation: "paymentCardIn 0.45s ease-out both" }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
          {phase === "redirect" ? (
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" aria-hidden />
          ) : (
            <ShieldCheck className="h-8 w-8 text-emerald-400" aria-hidden />
          )}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm text-white/55">{sub}</p>
        <p className="mt-6 text-xs text-white/35">Your session is encrypted end-to-end in production.</p>
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

export default function PaymentCheckoutPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CheckoutInner />
    </Suspense>
  );
}
