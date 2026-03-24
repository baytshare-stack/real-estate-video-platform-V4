import { cookies } from "next/headers";
import {
  defaultLocale,
  locales,
  type Locale,
  LOCALE_COOKIE,
  type Dictionary,
} from "./config";
import { getDictionary } from "./dictionaries";
import { translateWithFallback } from "./resolve";

export type ServerT = (namespaceOrPath: string, key?: string) => string;

function makeT(dict: Dictionary, enDict: Dictionary): ServerT {
  return (namespaceOrPath: string, key?: string) => {
    const path = key !== undefined ? `${namespaceOrPath}.${key}` : namespaceOrPath;
    return translateWithFallback(dict, enDict, path);
  };
}

/**
 * Server Components: locale from cookie + merged English fallback for missing keys.
 */
export async function getServerI18n() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale = raw && locales.includes(raw) ? raw : defaultLocale;
  const [dict, enDict] = await Promise.all([getDictionary(locale), getDictionary("en")]);
  const t = makeT(dict, enDict);
  return { locale, dict, enDict, t };
}

/** @deprecated Prefer getServerI18n — same behavior */
export async function getServerTranslation() {
  return getServerI18n();
}
