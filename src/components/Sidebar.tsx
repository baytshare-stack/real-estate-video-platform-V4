"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  Flame,
  PlaySquare,
  Compass,
  TrendingUp,
  Users,
  Building2,
  UserRound,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { stripLocaleFromPathname } from "@/i18n/routing";
import LocaleLink from "@/components/LocaleLink";
import { useSiteAppearance } from "@/components/site/SiteAppearanceProvider";
import type { SidebarDesktopKey, SidebarMobileKey } from "@/lib/site-appearance-shared";

type NavDef = {
  href: string;
  icon: typeof Home;
  label: (t: ReturnType<typeof useTranslation>["t"]) => string;
};

const DESKTOP_NAV: Record<SidebarDesktopKey, NavDef> = {
  home: { href: "/", icon: Home, label: (t) => t("nav", "home") },
  shorts: { href: "/shorts", icon: Flame, label: (t) => t("sidebar", "shorts") },
  subscribers: { href: "/subscribers", icon: Users, label: (t) => t("sidebar", "subscribers") },
  subscriptions: { href: "/subscriptions", icon: PlaySquare, label: (t) => t("sidebar", "subscriptions") },
  explore: { href: "/explore", icon: Compass, label: (t) => t("sidebar", "explore") },
  agents: { href: "/agents", icon: UserRound, label: (t) => t("sidebar", "agents") },
  agencies: { href: "/agencies", icon: Building2, label: (t) => t("sidebar", "agencies") },
  trending: { href: "/trending", icon: TrendingUp, label: (t) => t("sidebar", "trending") },
};

const MOBILE_NAV: Record<SidebarMobileKey, NavDef> = {
  home: DESKTOP_NAV.home,
  shorts: DESKTOP_NAV.shorts,
  explore: DESKTOP_NAV.explore,
  agents: DESKTOP_NAV.agents,
  agencies: DESKTOP_NAV.agencies,
  studio: {
    href: "/studio",
    icon: Settings,
    label: (t) => t("nav", "studio"),
  },
};

export default function Sidebar() {
  const pathname = usePathname();
  const path = stripLocaleFromPathname(pathname || "/");
  const { t } = useTranslation();
  const appearance = useSiteAppearance();
  const [collapsed, setCollapsed] = useState(false);

  const desktopOrder = appearance.layout.sidebarDesktop as SidebarDesktopKey[];
  const mobileOrder = appearance.layout.sidebarMobile as SidebarMobileKey[];

  const navItems = useMemo(
    () =>
      desktopOrder
        .map((key) => (DESKTOP_NAV[key] ? { key, ...DESKTOP_NAV[key] } : null))
        .filter(Boolean) as Array<NavDef & { key: string }>,
    [desktopOrder]
  );

  const mobileNavItems = useMemo(
    () =>
      mobileOrder
        .map((key) => (MOBILE_NAV[key] ? { key, ...MOBILE_NAV[key] } : null))
        .filter(Boolean) as Array<NavDef & { key: string }>,
    [mobileOrder]
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) setCollapsed(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const asideStyle = useMemo(
    () =>
      ({
        backgroundColor: "var(--site-bg, #0f0f0f)",
        borderColor: "var(--site-border, rgba(255,255,255,0.1))",
      }) as React.CSSProperties,
    []
  );

  const activeBar = "var(--site-primary, #2563eb)";
  const activeTint = "color-mix(in srgb, var(--site-primary, #3b82f6) 18%, transparent)";
  const activeText = "var(--site-primary, #60a5fa)";

  return (
    <>
      <aside
        className={`fixed start-0 top-16 z-40 hidden h-[calc(100vh-64px)] flex-col overflow-y-auto border-e py-3 hide-scrollbar transition-all duration-300 xl:flex ${collapsed ? "w-20" : "w-60"}`}
        style={asideStyle}
      >
        <div className="flex flex-col gap-1 px-3">
          {navItems.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? path === "/"
                : path === link.href || path.startsWith(`${link.href}/`);
            return (
              <LocaleLink
                key={link.key}
                href={link.href}
                className={`group relative flex items-center gap-4 rounded-xl px-3 py-2.5 transition-all ${
                  isActive ? "text-blue-400" : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
                style={
                  isActive
                    ? { backgroundColor: activeTint, color: activeText }
                    : undefined
                }
              >
                {isActive && (
                  <div
                    className="absolute start-0 top-2 bottom-2 w-1 rounded-e-full"
                    style={{ backgroundColor: activeBar }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 flex-shrink-0 ${isActive ? "" : "group-hover:text-white"}`}
                  style={isActive ? { color: activeText } : undefined}
                />
                {!collapsed && (
                  <span className="truncate text-sm font-semibold tracking-wide">{link.label(t)}</span>
                )}
                {collapsed && (
                  <div className="pointer-events-none absolute left-16 z-50 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {link.label(t)}
                  </div>
                )}
              </LocaleLink>
            );
          })}
        </div>

        <div
          className="mt-auto border-t border-white/5 px-3 pt-4"
          style={{ borderColor: "var(--site-border, rgba(255,255,255,0.05))" }}
        >
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && <span className="text-sm font-medium">{t("sidebar", "collapse")}</span>}
          </button>

          <LocaleLink
            href="/settings"
            className="flex items-center gap-4 rounded-xl px-3 py-2.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{t("sidebar", "settings")}</span>}
          </LocaleLink>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md xl:hidden"
        style={{
          backgroundColor: "color-mix(in srgb, var(--site-bg, #0a0a0a) 92%, transparent)",
          borderColor: "var(--site-border, rgba(255,255,255,0.1))",
        }}
        aria-label="Primary"
      >
        <div className="flex h-14 min-h-14 items-stretch overflow-x-auto hide-scrollbar">
          {mobileNavItems.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? path === "/"
                : path === link.href || path.startsWith(`${link.href}/`);
            return (
              <LocaleLink
                key={link.key}
                href={link.href}
                className={`flex min-w-[4.25rem] max-w-[5.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors active:opacity-80 ${
                  isActive ? "" : "text-gray-500"
                }`}
                style={isActive ? { color: activeText } : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="line-clamp-2 w-full text-center text-[9px] font-bold uppercase leading-tight tracking-tight">
                  {link.label(t)}
                </span>
              </LocaleLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
