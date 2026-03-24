import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/admin-session-server";

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    userId: session.userId,
    role: "admin",
  });
}
