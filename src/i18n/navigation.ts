"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageProvider";
import { prefixWithLocale } from "@/i18n/routing";

export function useLocalizedPath() {
  const { locale } = useTranslation();
  return useCallback(
    (path: string) => {
      const p = path.startsWith("/") ? path : `/${path}`;
      return prefixWithLocale(locale, p);
    },
    [locale]
  );
}

/** Prefix internal app hrefs with the active locale; leaves http(s), mailto, and already-localized URLs unchanged. */
export function useLocalizeAppHref() {
  const { locale } = useTranslation();
  return useCallback(
    (href: string) => {
      if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
        return href;
      }
      const match = href.match(/^(\/[^?#]*)(\?[^#]*)?(#.*)?$/);
      if (!match) return href;
      const pathname = match[1];
      if (/^\/(en|ar)(\/|$)/.test(pathname)) return href;
      if (!pathname.startsWith("/")) return href;
      return `${prefixWithLocale(locale, pathname)}${match[2] ?? ""}${match[3] ?? ""}`;
    },
    [locale]
  );
}

export function useLocalizedRouter() {
  const router = useRouter();
  const to = useLocalizedPath();
  return {
    push: (path: string) => router.push(to(path)),
    replace: (path: string) => router.replace(to(path)),
    prefetch: (path: string) => router.prefetch(to(path)),
    refresh: () => router.refresh(),
  };
}
