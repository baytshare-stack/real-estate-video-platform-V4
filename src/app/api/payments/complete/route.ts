import { NextResponse } from "next/server";
import { requireStudioUser } from "@/lib/ads-platform/auth";
import { completeWalletTopUpIntent } from "@/lib/payments/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await requireStudioUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { intentId?: string; returnToken?: string };
  const intentId = (body.intentId || "").trim();
  const returnToken = (body.returnToken || "").trim();
  if (!intentId || !returnToken) {
    return NextResponse.json({ error: "intentId and returnToken required" }, { status: 400 });
  }

  try {
    const result = await completeWalletTopUpIntent({
      intentId,
      returnToken,
      userId: user.id,
    });
    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      amount: result.amount,
      newBalance: result.newBalance.toString(),
      currency: result.currency,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    if (msg === "NOT_FOUND" || msg === "INVALID_TOKEN") {
      return NextResponse.json({ error: "Invalid payment session" }, { status: 403 });
    }
    if (msg === "INTENT_FAILED") {
      return NextResponse.json({ error: "Payment already failed" }, { status: 400 });
    }
    if (msg === "VERIFY_FAILED" || msg.includes("unverified")) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }
    if (msg === "CONFLICT") {
      return NextResponse.json({ error: "Payment in progress, retry shortly" }, { status: 409 });
    }
    console.error("payment complete", e);
    return NextResponse.json({ error: "Completion failed" }, { status: 500 });
  }
}
