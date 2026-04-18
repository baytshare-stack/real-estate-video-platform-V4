import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const ADMIN_SESSION_COOKIE = "bytaktube_admin_session";

const DEV_FALLBACK = "dev-admin-jwt-secret-change-me";

export function getAdminJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      return new TextEncoder().encode(DEV_FALLBACK);
    }
    throw new Error("Set ADMIN_JWT_SECRET or NEXTAUTH_SECRET for admin sessions.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(input: { userId: string; role: "ADMIN" }): Promise<string> {
  return new SignJWT({ role: input.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAdminJwtSecret());
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecret());
    const role = payload.role as string;
    const sub = payload.sub as string;
    if (!sub || role !== "ADMIN") return null;
    return { userId: sub, role: "ADMIN" as const };
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  };
}
