"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/LanguageProvider';

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  // Sync collision state with window size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) setCollapsed(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { name: t("nav", "home"), href: "/", icon: Home },
    { name: t("sidebar", "shorts"), href: "/shorts", icon: Flame },
    { name: t("sidebar", "subscribers"), href: "/subscribers", icon: Users },
    { name: t("sidebar", "subscriptions"), href: "/subscriptions", icon: PlaySquare },
    { name: t("sidebar", "explore"), href: "/explore", icon: Compass },
    { name: t("sidebar", "agents"), href: "/agents", icon: UserRound },
    { name: t("sidebar", "agencies"), href: "/agencies", icon: Building2 },
    { name: t("sidebar", "trending"), href: "/trending", icon: TrendingUp },
  ];

  const mobileNavItems = [
    { name: t("nav", "home"), href: "/", icon: Home },
    { name: t("sidebar", "shorts"), href: "/shorts", icon: Flame },
    { name: t("sidebar", "explore"), href: "/explore", icon: Compass },
    { name: t("sidebar", "agents"), href: "/agents", icon: UserRound },
    { name: t("sidebar", "agencies"), href: "/agencies", icon: Building2 },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside 
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-[#0f0f0f] border-r border-white/10 overflow-y-auto hide-scrollbar hidden xl:flex flex-col py-3 z-40 transition-all duration-300 ${collapsed ? 'w-20' : 'w-60'}`}
      >
        <div className="flex flex-col gap-1 px-3">
          {navItems.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all relative group ${isActive ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
              >
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />}
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'group-hover:text-white'}`} />
                {!collapsed && <span className="text-sm font-semibold tracking-wide truncate">{link.name}</span>}
                {collapsed && (
                  <div className="absolute left-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {link.name}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto px-3 pt-4 border-t border-white/5">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5 text-gray-400 hover:text-white"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
          
          <Link href="/settings" className="flex items-center gap-4 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5 text-gray-400 hover:text-white">
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation (scrollable row + safe area) ── */}
      <nav
        className="xl:hidden fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-gray-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Primary"
      >
        <div className="flex h-14 min-h-14 items-stretch overflow-x-auto hide-scrollbar">
          {mobileNavItems.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-w-[4.25rem] max-w-[5.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors active:opacity-80 ${
                  isActive ? "text-blue-400" : "text-gray-500"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="line-clamp-2 w-full text-center text-[9px] font-bold uppercase leading-tight tracking-tight">
                  {link.name}
                </span>
              </Link>
            );
          })}
          <Link
            href="/studio"
            className={`flex min-w-[4.25rem] max-w-[5.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors active:opacity-80 ${
              pathname === "/studio" ? "text-blue-400" : "text-gray-500"
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-center text-[9px] font-bold uppercase leading-tight tracking-tight">Studio</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
