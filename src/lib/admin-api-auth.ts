import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/admin-session-server";

export async function requireAdminApi(): Promise<{ userId: string } | NextResponse> {
  const s = await getAdminSessionFromCookies();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return { userId: s.userId };
}
