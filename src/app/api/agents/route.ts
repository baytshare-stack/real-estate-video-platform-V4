import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDbHost(): string {
  const u = process.env.DATABASE_URL;
  if (!u?.trim()) return "(DATABASE_URL unset)";
  try {
    return new URL(u.replace(/^postgresql:/i, "http:")).hostname;
  } catch {
    return "(DATABASE_URL parse error)";
  }
}

/**
 * GET /api/agents — lists AGENT + AGENCY rows for debugging production DB connectivity.
 * Does not return emails. For dashboard use; consider auth if you expose richer data later.
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["AGENT", "AGENCY"] },
        isBlocked: false,
      },
      select: {
        id: true,
        role: true,
        fullName: true,
        name: true,
        username: true,
        country: true,
        city: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    console.log(
      "[api/agents] Agents fetched:",
      users.length,
      "| dbHost=",
      safeDbHost(),
      "| vercel=",
      process.env.VERCEL ?? "0"
    );

    return NextResponse.json({
      ok: true,
      count: users.length,
      items: users,
    });
  } catch (e) {
    console.error("[api/agents] query failed:", e, "| dbHost=", safeDbHost());
    return NextResponse.json(
      { ok: false, error: "Database query failed", dbHost: safeDbHost() },
      { status: 500 }
    );
  }
}
