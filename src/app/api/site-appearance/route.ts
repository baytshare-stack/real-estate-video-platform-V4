import { NextResponse } from "next/server";
import { getSiteAppearanceUncached } from "@/lib/site-appearance";

export const dynamic = "force-dynamic";

/** Public read for SSR / clients (short cache). */
export async function GET() {
  try {
    const appearance = await getSiteAppearanceUncached();
    return NextResponse.json(appearance, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load appearance." }, { status: 500 });
  }
}
