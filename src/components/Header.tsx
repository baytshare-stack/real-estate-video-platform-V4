"use client";

import { useSession, signOut } from "next-auth/react";
import { Search, Video, UserCircle, Menu, LogOut, X, ArrowLeft } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useLocalizedPath } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";
import LocaleLink from "@/components/LocaleLink";
import { useSiteAppearance } from "@/components/site/SiteAppearanceProvider";
import type { HeaderRightKey } from "@/lib/site-appearance-shared";

export default function Header() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const localizedPath = useLocalizedPath();
  const appearance = useSiteAppearance();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const headerOrder = appearance.layout.headerRight;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSearchOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q");
    if (q) {
      router.push(`${localizedPath("/search")}?q=${encodeURIComponent(q.toString())}`);
      setMobileSearchOpen(false);
    }
  };

  const headerStyle = useMemo(
    () =>
      ({
        backgroundColor: "var(--site-bg, #0f0f0f)",
        borderColor: "var(--site-border, rgba(255,255,255,0.1))",
      }) as React.CSSProperties,
    []
  );

  const searchShellStyle = useMemo(
    () =>
      ({
        borderColor: "var(--site-border, rgba(255,255,255,0.15))",
        backgroundColor: "var(--site-surface, #121212)",
      }) as React.CSSProperties,
    []
  );

  const slots: Record<HeaderRightKey, React.ReactNode> = {
    mobile_search: (
      <button
        type="button"
        onClick={() => setMobileSearchOpen(true)}
        className="rounded-full p-2.5 text-gray-400 transition-colors hover:bg-white/10 md:hidden"
        aria-label={t("search", "placeholder")}
      >
        <Search className="h-5 w-5" />
      </button>
    ),
    upload: (
      <LocaleLink
        href="/upload"
        className="flex items-center gap-1.5 rounded-full border p-2.5 transition-all sm:gap-2 sm:px-4 sm:py-2"
        style={{
          borderColor: "color-mix(in srgb, var(--site-primary, #3b82f6) 35%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--site-primary, #3b82f6) 12%, transparent)",
          color: "var(--site-primary, #60a5fa)",
        }}
        title={t("nav", "upload")}
        aria-label={t("nav", "upload")}
      >
        <Video className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
        <span className="hidden text-xs font-bold sm:inline">{t("nav", "upload")}</span>
      </LocaleLink>
    ),
    language: (
      <div className="shrink-0">
        <LanguageSwitcher />
      </div>
    ),
    user:
      status === "loading" ? (
        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-800 px-8 tracking-widest" />
      ) : session ? (
        <div className="flex items-center gap-3">
          <NotificationBell />
          <LocaleLink
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
            style={{
              boxShadow: "0 10px 25px color-mix(in srgb, var(--site-primary, #3b82f6) 25%, transparent)",
            }}
            title={t("auth", "profile")}
          >
            {session.user?.name?.charAt(0) || "U"}
          </LocaleLink>
          <button
            onClick={() => signOut()}
            className="hidden rounded-full p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 sm:block"
            title={t("auth", "signOut")}
            type="button"
            aria-label={t("auth", "signOut")}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <LocaleLink
          href="/login"
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-black uppercase text-black transition-colors hover:bg-gray-200"
        >
          <UserCircle className="h-4 w-4" />
          {t("nav", "login")}
        </LocaleLink>
      ),
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b px-2 sm:px-4"
      style={headerStyle}
    >
      <div className="flex min-w-0 shrink items-center gap-2 sm:gap-4">
        <button type="button" className="hidden rounded-full p-2 transition-colors hover:bg-white/10 xl:block">
          <Menu className="h-6 w-6 text-white" />
        </button>
        <LocaleLink href="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {appearance.logoUrl ? (
            <img
              src={appearance.logoUrl}
              alt=""
              className="h-8 w-auto max-w-[140px] shrink-0 object-contain"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl font-bold text-white shadow-lg"
              style={{
                backgroundColor: "var(--site-primary, #2563eb)",
                boxShadow: "0 10px 25px color-mix(in srgb, var(--site-primary, #3b82f6) 35%, transparent)",
              }}
            >
              R
            </div>
          )}
          <span
            className="hidden truncate text-lg font-black uppercase tracking-tighter sm:block sm:text-xl"
            style={{ color: "var(--site-text, #fff)" }}
          >
            {t("brand", "name")}
          </span>
        </LocaleLink>
      </div>

      <div className="hidden max-w-2xl flex-1 items-center px-8 md:flex">
        <form
          onSubmit={handleSearch}
          className="flex w-full overflow-hidden rounded-full border transition-all focus-within:ring-4"
          style={{
            ...searchShellStyle,
            borderColor: "var(--site-border, rgba(255,255,255,0.15))",
          }}
        >
          <input
            type="text"
            name="q"
            placeholder={t("search", "placeholder")}
            className="w-full bg-transparent px-5 py-2.5 text-sm text-white outline-none placeholder:text-gray-600"
          />
          <button
            type="submit"
            className="flex items-center justify-center border-s px-6 transition-colors hover:bg-white/10"
            style={{ borderColor: "var(--site-border, rgba(255,255,255,0.1))" }}
          >
            <Search className="h-4 w-4 text-gray-400" />
          </button>
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-4">
        {headerOrder.map((key) => (
          <span key={key} className="contents">
            {slots[key as HeaderRightKey]}
          </span>
        ))}
      </div>

      {mobileSearchOpen && (
        <div className="animate-in fade-in slide-in-from-top-4 fixed inset-0 z-[60] flex flex-col bg-[var(--site-bg,#0f0f0f)] duration-200">
          <div
            className="flex h-16 items-center gap-2 border-b px-4"
            style={{ borderColor: "var(--site-border, rgba(255,255,255,0.1))" }}
          >
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <form
              onSubmit={handleSearch}
              className="flex flex-1 items-center rounded-full border border-white/10 bg-gray-900 px-4 py-1.5"
            >
              <input
                autoFocus
                type="text"
                name="q"
                placeholder={t("search", "placeholder")}
                className="w-full bg-transparent text-white outline-none placeholder:text-gray-600"
              />
              <button type="submit" className="p-1.5 text-gray-400">
                <Search className="h-5 w-5" />
              </button>
            </form>
            <button type="button" onClick={() => setMobileSearchOpen(false)} className="p-2 text-gray-400">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6 text-sm italic text-gray-500">{t("header", "mobileSearchHint")}</div>
        </div>
      )}
    </header>
  );
}
