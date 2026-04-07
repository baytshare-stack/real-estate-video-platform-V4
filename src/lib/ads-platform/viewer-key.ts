import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import type { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";

export const lastAdCookieName = (slot: "PRE_ROLL" | "MID_ROLL") => `adl_${slot}`;

function anonymousRequestFingerprint(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  const salt = process.env.NEXTAUTH_SECRET || process.env.ADS_VIEWER_SALT || "ads-viewer";
  return createHash("sha256").update(`${salt}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const segment of cookieHeader.split(";")) {
    const idx = segment.indexOf("=");
    if (idx === -1) continue;
    const k = segment.slice(0, idx).trim();
    const v = segment.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/** Logged-in: user id. Anonymous: stable fingerprint per request (parallel PRE/MID share cap). */
export async function resolveAdViewerKey(req: Request): Promise<{ viewerKey: string }> {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (uid) {
    return { viewerKey: `u:${uid}` };
  }
  return { viewerKey: `f:${anonymousRequestFingerprint(req)}` };
}

export function getLastServedAdForSlot(req: Request, slot: "PRE_ROLL" | "MID_ROLL"): string | null {
  const v = parseCookies(req.headers.get("cookie"))[lastAdCookieName(slot)]?.trim();
  return v || null;
}

export function applyAdDeliveryCookies(
  res: NextResponse,
  opts: { slot: "PRE_ROLL" | "MID_ROLL"; servedAdId: string | null }
) {
  const base = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  if (opts.servedAdId) {
    res.cookies.set(lastAdCookieName(opts.slot), opts.servedAdId, {
      ...base,
      httpOnly: true,
      maxAge: 60 * 60 * 24,
    });
  }
}
