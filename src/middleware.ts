import { NextResponse, type NextRequest } from "next/server";
import { locales, type Locale, LOCALE_COOKIE } from "@/i18n/config";
import {
  isPathWithoutLocalePrefix,
  LOCALE_HEADER,
  parseLocaleFromPathname,
  prefixWithLocale,
  resolveLocaleFromRequest,
} from "@/i18n/routing";
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from "@/lib/admin-jwt";

const COOKIE_OPTS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

function nextWithRequestLocale(request: NextRequest, locale: Locale): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set(LOCALE_COOKIE, locale, COOKIE_OPTS);
  return res;
}

function setLocaleCookie(res: NextResponse, locale: Locale) {
  res.cookies.set(LOCALE_COOKIE, locale, COOKIE_OPTS);
  return res;
}

function requiresAdminAuth(pathname: string): boolean {
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const acceptLang = request.headers.get("accept-language");
  const fallbackLocale = resolveLocaleFromRequest(pathname, cookieLocale, acceptLang);

  if (requiresAdminAuth(pathname)) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = token ? await verifyAdminToken(token) : null;

    if (!session) {
      if (pathname.startsWith("/api/")) {
        return setLocaleCookie(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), fallbackLocale);
      }
      return setLocaleCookie(NextResponse.redirect(new URL("/admin-login", request.url)), fallbackLocale);
    }
  }

  if (isPathWithoutLocalePrefix(pathname)) {
    return nextWithRequestLocale(request, fallbackLocale);
  }

  const { locale: prefixLocale, restPath } = parseLocaleFromPathname(pathname);

  if (prefixLocale && locales.includes(prefixLocale)) {
    return nextWithRequestLocale(request, prefixLocale);
  }

  const targetLocale = fallbackLocale;
  const redirectPath = prefixWithLocale(targetLocale, restPath === "/" ? "/" : restPath);
  const url = request.nextUrl.clone();
  url.pathname = redirectPath;
  const res = NextResponse.redirect(url);
  return setLocaleCookie(res, targetLocale);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff2?)$).*)"],
};
