"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Dictionary, Locale } from "./config";
import { locales, LOCALE_STORAGE_KEY, LOCALE_USER_CHOICE_KEY, languages } from "./config";
import { translateWithFallback } from "./resolve";
import { prefixWithLocale, stripLocaleFromPathname } from "./routing";

export type TranslateFn = (namespaceOrPath: string, key?: string) => string;

type LanguageContextType = {
  locale: Locale;
  dir: "ltr" | "rtl";
  language: Locale;
  dict: Dictionary;
  /** Two-arg: t('nav','home') or single path: t('nav.home') */
  t: TranslateFn;
  setLocale: (next: Locale) => Promise<void>;
  /** Alias for setLocale — switches language globally (cookie + refresh). */
  setLanguage: (next: Locale) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({
  children,
  locale,
  dictionary,
  fallbackDictionary,
}: {
  children: React.ReactNode;
  locale: Locale;
  dictionary: Dictionary;
  /** Always English — used when a key is missing in the active locale */
  fallbackDictionary: Dictionary;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const hasSyncedStorage = useRef(false);

  const t: TranslateFn = useCallback(
    (namespaceOrPath: string, key?: string) => {
      const path = key !== undefined ? `${namespaceOrPath}.${key}` : namespaceOrPath;
      return translateWithFallback(dictionary, fallbackDictionary, path);
    },
    [dictionary, fallbackDictionary]
  );

  const dir = languages[locale]?.dir ?? "ltr";

  /** Persist locale without marking an explicit user choice (e.g. browser-language bootstrap). */
  const applyLocale = useCallback(
    async (next: Locale) => {
      if (!locales.includes(next)) return;
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
        await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        });
        document.documentElement.lang = next;
        document.documentElement.dir = languages[next].dir;
        const rest = stripLocaleFromPathname(pathname || "/");
        router.push(prefixWithLocale(next, rest));
      } catch (e) {
        console.error("applyLocale failed", e);
      }
    },
    [router, pathname]
  );

  const setLocale = useCallback(
    async (next: Locale) => {
      if (!locales.includes(next)) return;
      try {
        localStorage.setItem(LOCALE_USER_CHOICE_KEY, "1");
      } catch {
        /* ignore */
      }
      await applyLocale(next);
    },
    [applyLocale]
  );

  // Persist server locale to localStorage; one-way sync localStorage → server if user preference differs
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  useEffect(() => {
    if (typeof window === "undefined" || hasSyncedStorage.current) return;
    hasSyncedStorage.current = true;
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored && locales.includes(stored) && stored !== locale) {
      fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: stored }),
      }).then(() => {
        const rest = stripLocaleFromPathname(pathname || "/");
        router.replace(prefixWithLocale(stored, rest));
      });
    }
  }, [locale, router, pathname]);

  const value = useMemo(
    () => ({
      locale,
      language: locale,
      dir,
      dict: dictionary,
      t,
      setLocale,
      setLanguage: setLocale,
    }),
    [locale, dir, dictionary, t, setLocale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
