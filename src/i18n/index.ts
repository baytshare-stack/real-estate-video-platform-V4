/**
 * Client-safe i18n public API.
 * For Server Components use `getServerI18n` from `@/i18n/server`.
 * Dictionaries load from `./locales/*.json` (see `dictionaries.ts`).
 */
export {
  defaultLocale,
  locales,
  languages,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  LOCALE_USER_CHOICE_KEY,
  type Locale,
  type Dictionary,
} from "./config";

export { LanguageProvider, useTranslation, type TranslateFn } from "./LanguageProvider";
export { useSafeT, reportUntranslatedLiteral } from "./useSafeT";
