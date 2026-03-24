// src/i18n/config.ts — add new locales here + matching JSON in locales/

export type Locale = "en" | "ar";

export const locales: Locale[] = ["en", "ar"];

export const defaultLocale: Locale = "en";

/** Cookie read by the server (layout, RSC). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Client persistence (preference). */
export const LOCALE_STORAGE_KEY = "RETV_LOCALE";

export const languages: Record<
  Locale,
  { name: string; nativeName: string; dir: "ltr" | "rtl"; flag: string }
> = {
  en: { name: "English", nativeName: "English", dir: "ltr", flag: "🇺🇸" },
  ar: { name: "Arabic", nativeName: "العربية", dir: "rtl", flag: "🇸🇦" },
};

export type Dictionary = Record<string, string | Record<string, unknown>>;
