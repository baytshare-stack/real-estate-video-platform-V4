import { NextResponse } from "next/server";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    rows: [],
    summary: { impressions: 0, views: 0, clicks: 0, leads: 0, spend: 0, ctr: 0, costPerLead: 0 },
  });
}
