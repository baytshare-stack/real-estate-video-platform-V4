import { NextResponse } from "next/server";
import { validateEmailEnvironment } from "@/lib/email";

/**
 * GET /api/health/email — configuration check for Vercel / ops (no secrets returned).
 * Optional: protect behind auth or restrict by IP in production if you expose details.
 */
export async function GET() {
  const { ready, provider, issues } = validateEmailEnvironment();
  return NextResponse.json(
    {
      ok: ready,
      provider,
      issues: ready ? [] : issues,
    },
    { status: ready ? 200 : 503 }
  );
}
