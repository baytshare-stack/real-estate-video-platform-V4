import { defaultLocale, locales, type Locale, LOCALE_COOKIE } from "./config";

export const LOCALE_HEADER = "x-retv-locale";

/** Paths that never get a /[locale] prefix (root app routes). */
export function isPathWithoutLocalePrefix(pathname: string): boolean {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname === "/admin-login" || pathname.startsWith("/admin-login/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (/\.(ico|png|jpg|jpeg|gif|webp|svg|mp4|woff2?|txt|xml)$/i.test(pathname)) return true;
  return false;
}

export function parseLocaleFromPathname(pathname: string): { locale: Locale | null; restPath: string } {
  const m = pathname.match(/^\/(en|ar)(?=\/|$)/);
  if (!m) return { locale: null, restPath: pathname };
  const loc = m[1] as Locale;
  if (!locales.includes(loc)) return { locale: null, restPath: pathname };
  const after = pathname.slice(3); // /en or /ar
  const restPath = after === "" || after === "/" ? "/" : after.startsWith("/") ? after : `/${after}`;
  return { locale: loc, restPath };
}

/** Strip leading /en or /ar from a pathname. */
export function stripLocaleFromPathname(pathname: string): string {
  const { restPath } = parseLocaleFromPathname(pathname);
  return restPath;
}

/** Build /{locale}/path with no duplicate slashes. Path should start with / or be "". */
export function prefixWithLocale(locale: Locale, path: string): string {
  const p = path === "" || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${p}`;
}

export function resolveLocaleFromRequest(
  pathname: string,
  cookieValue: string | undefined,
  acceptLanguage: string | null
): Locale {
  const fromPath = parseLocaleFromPathname(pathname).locale;
  if (fromPath) return fromPath;
  if (cookieValue && locales.includes(cookieValue as Locale)) return cookieValue as Locale;
  if (!acceptLanguage) return defaultLocale;
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("ar")) return "ar";
  return defaultLocale;
}

export { LOCALE_COOKIE };
