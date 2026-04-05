"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  Gauge,
  LogOut,
  Megaphone,
  Settings,
  Users,
  Video,
  Waypoints,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <Gauge className="h-4 w-4" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/videos", label: "Videos", icon: <Video className="h-4 w-4" /> },
  { href: "/admin/channels", label: "Channels", icon: <Waypoints className="h-4 w-4" /> },
  { href: "/admin/ads", label: "Smart ads", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/admin/crm", label: "CRM", icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default function Sidebar({
  pathname,
  onLogout,
  className,
}: {
  pathname?: string;
  onLogout?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/60">Admin</p>
          <p className="truncate text-sm font-semibold text-white">BytakTube</p>
        </div>

        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        ) : null}
      </div>

      <nav aria-label="Admin navigation">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/admin/dashboard"
                ? pathname === "/admin/dashboard" || pathname === "/admin"
                : pathname?.startsWith(item.href) ?? false;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-indigo-500/15 text-white border border-indigo-400/20"
                      : "text-white/70 hover:bg-white/10 hover:text-white border border-transparent",
                  ].join(" ")}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

