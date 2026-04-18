import { NextResponse } from "next/server";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";

/**
 * Video creatives are global inventory (admin). Studio keeps wallet/campaign flows only.
 */
export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    ads: [],
    notice: "Video pre-roll / mid-roll ads are managed in Admin → Ads.",
  });
}

export async function POST() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { error: "Video ads are created in the admin console (Admin → Ads)." },
    { status: 400 }
  );
}
