"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { locales, languages, type Locale } from "@/i18n/config";

export default function LanguageSwitcher() {
  const { locale, t, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale || pending) return;
    setPending(true);
    setIsOpen(false);
    try {
      await setLanguage(newLocale);
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={pending}
        className="flex items-center gap-2 rounded-full p-2 text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        title={t("language", "switchTitle")}
        aria-label={t("language", "switchTitle")}
        aria-expanded={isOpen}
      >
        <Globe className="h-5 w-5" />
        <span className="hidden text-sm font-medium uppercase lg:block">{locale}</span>
      </button>

      {isOpen ? (
        <div className="absolute end-0 z-50 mt-2 w-48 origin-top-end rounded-xl border border-white/10 bg-[#282828] py-2 shadow-2xl">
          <div className="mb-2 border-b border-white/10 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {t("language", "selectLabel")}
            </span>
          </div>
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => void handleLanguageChange(l)}
              className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                locale === l
                  ? "bg-white/10 font-bold text-white"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{languages[l].nativeName}</span>
              {locale === l ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
