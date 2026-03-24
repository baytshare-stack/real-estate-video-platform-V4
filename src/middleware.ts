import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales, type Locale, LOCALE_COOKIE } from "@/i18n/config";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminToken,
} from "@/lib/admin-jwt";

function detectFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("ar")) return "ar";
  return defaultLocale;
}

function requiresAdminAuth(pathname: string): boolean {
  // "/admin-login" starts with "/admin" — must be excluded first
  if (pathname === "/admin-login" || pathname.startsWith("/admin-login/")) {
    return false;
  }
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
      return false;
    }
    return true;
  }
  if (pathname.startsWith("/api/admin/")) {
    // POST /api/admin/auth — login (no JWT yet)
    if (pathname === "/api/admin/auth") {
      return false;
    }
    if (pathname === "/api/admin/auth/login" || pathname.startsWith("/api/admin/auth/login/")) {
      return false;
    }
    if (pathname === "/api/admin/auth/logout" || pathname.startsWith("/api/admin/auth/logout/")) {
      return false;
    }
    return true;
  }
  return false;
}

function applyLocale(request: NextRequest, response: NextResponse) {
  const existing = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (!existing || !locales.includes(existing)) {
    const locale = detectFromAcceptLanguage(request.headers.get("accept-language"));
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (requiresAdminAuth(pathname)) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = token ? await verifyAdminToken(token) : null;

    if (!session) {
      if (pathname.startsWith("/api/")) {
        const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        applyLocale(request, res);
        return res;
      }
      const res = NextResponse.redirect(new URL("/admin-login", request.url));
      applyLocale(request, res);
      return res;
    }
  }

  const res = NextResponse.next();
  applyLocale(request, res);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff2?)$).*)"],
};
