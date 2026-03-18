import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { locales, defaultLocale, type Locale } from "./i18n/config";

// Simple in-memory rate limiter (for demo)
// In production use Redis like @upstash/redis
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

function getLocale(request: NextRequest): Locale {
  // 1. Check if the user already has a sticky language preference
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }
  
  // 2. Parse Accept-Language header to detect browser language automatically
  const acceptLang = request.headers.get("accept-language") || "";
  for (const lang of acceptLang.split(",")) {
    const code = lang.split(';')[0].trim().substring(0, 2).toLowerCase();
    if (locales.includes(code as Locale)) {
      return code as Locale;
    }
  }
  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response: NextResponse | null = null;

  // Get user IP safely
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Rate limiting for sensitive routes
  if (
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/callback/credentials")
  ) {
    if (ip !== "unknown") {
      const currentTime = Date.now();
      const record = rateLimitMap.get(ip);

      if (!record || currentTime > record.resetTime) {
        rateLimitMap.set(ip, {
          count: 1,
          resetTime: currentTime + RATE_LIMIT_WINDOW,
        });
      } else {
        if (record.count >= MAX_REQUESTS) {
          response = new NextResponse("Too Many Requests", { status: 429 });
        } else {
          record.count += 1;
        }
      }
    }
  }

  // Protect admin routes
  // NOTE:
  // Admin route access is guarded in `src/app/admin/layout.tsx` using a
  // localStorage-backed admin session (temporary approach).
  // Middleware cannot read localStorage, so we do not enforce /admin here.

  // If no response has been decided, continue to the next handler.
  if (!response) {
    response = NextResponse.next();
  }

  // Ensure NEXT_LOCALE cookie logic
  const locale = getLocale(request);
  response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  // Add security headers to all responses.
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|favicon.ico|images|api).*)"
  ],
};