"use client";

import { useCallback } from "react";
import { useTranslation } from "./LanguageProvider";

/**
 * Returns t(namespace, key) and in development warns when the key is missing
 * (resolve falls back to the dotted path string).
 */
export function useSafeT() {
  const { t } = useTranslation();
  return useCallback(
    (namespace: string, key: string, fallback?: string) => {
      const path = `${namespace}.${key}`;
      const result = t(namespace, key);
      if (process.env.NODE_ENV === "development") {
        if (!result || result === path) {
          console.warn(`[i18n] Missing translation: ${path}`);
        }
      }
      if (fallback && (!result || result === path)) return fallback;
      return result || path;
    },
    [t]
  );
}

/**
 * Dev-only: call when you intentionally pass dynamic copy; reminds authors to route UI through t().
 */
export function reportUntranslatedLiteral(text: string, context = ""): string {
  if (process.env.NODE_ENV === "development" && typeof text === "string") {
    const s = text.trim();
    if (s.length >= 2 && /[A-Za-z\u0600-\u06FF]/.test(s) && !s.startsWith("http")) {
      const preview = s.length > 100 ? `${s.slice(0, 100)}…` : s;
      console.warn(
        `[i18n] Untranslated UI text detected${context ? ` (${context})` : ""}: "${preview}"`
      );
    }
  }
  return text;
}
