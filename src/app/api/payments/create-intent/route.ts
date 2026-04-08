import { NextResponse } from "next/server";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { createWalletTopUpIntent } from "@/lib/payments/service";
import { getStudioPaymentConfig } from "@/lib/payments/payment-settings";
import { isPaymentProviderId } from "@/lib/payments/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) {
    return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });
  }

  const body = (await req.json()) as { amount?: number; provider?: string; locale?: string };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const locale = String(body.locale || "en").replace(/[^a-zA-Z-]/g, "") || "en";
  const studioCfg = await getStudioPaymentConfig();
  const requested = body.provider?.trim().toLowerCase();
  const provider =
    requested && isPaymentProviderId(requested) ? requested : studioCfg.defaultProvider;

  try {
    const out = await createWalletTopUpIntent({
      userId: auth.user.id,
      amount,
      provider,
      locale,
    });
    return NextResponse.json({
      intentId: out.intentId,
      returnToken: out.returnToken,
      redirectUrl: out.redirectUrl,
      provider: out.provider,
      amount: out.amount,
      currency: out.currency,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PROVIDER_DISABLED" || msg === "PROVIDER_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Payment provider not configured" }, { status: 400 });
    }
    if (msg === "INVALID_AMOUNT") {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    console.error("create-intent", e);
    return NextResponse.json({ error: "Could not start payment" }, { status: 500 });
  }
}
