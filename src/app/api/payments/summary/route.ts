import { NextResponse } from "next/server";
import { requireStudioUser } from "@/lib/ads-platform/auth";
import { getIntentSummaryForUser } from "@/lib/payments/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireStudioUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const intentId = (searchParams.get("intentId") || "").trim();
  const returnToken = (searchParams.get("token") || "").trim();
  if (!intentId || !returnToken) {
    return NextResponse.json({ error: "Missing intentId or token" }, { status: 400 });
  }

  const summary = await getIntentSummaryForUser({
    intentId,
    returnToken,
    userId: user.id,
  });
  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(summary);
}
