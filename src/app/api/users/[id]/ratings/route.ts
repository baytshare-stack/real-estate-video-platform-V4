import { NextResponse } from "next/server";

/** Placeholder — discovery UI may call this; returns empty until ratings are implemented. */
export async function GET(_req: Request, _ctx: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ ratings: [] as unknown[] });
}
