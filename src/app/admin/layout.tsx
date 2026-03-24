"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Menu } from "lucide-react";
import Sidebar from "@/components/admin/Sidebar";

/** Only routes under `app/admin/*` (not `/admin-login`, which lives at app root). */
const LOGIN_PATHS = new Set(["/admin/login"]);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const isLoginRoute = pathname ? LOGIN_PATHS.has(pathname) : false;

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const onLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // still navigate away
    }
    router.replace("/admin-login");
  };

  if (isLoginRoute) return <>{children}</>;

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-4 py-6">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
          <p className="text-sm font-semibold text-white/80 truncate">Admin</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <aside className="relative overflow-hidden hidden lg:block rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
            <div className="relative p-4">
              <Sidebar pathname={pathname} onLogout={onLogout} />
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-2xl overflow-hidden">
            <div className="pointer-events-none absolute" />
            <div className="p-4 sm:p-6">{children}</div>
          </section>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative h-full w-full max-w-[320px]">
            <div className="absolute left-0 top-0 h-full w-full rounded-none border-r border-white/10 bg-[#0f0f0f]">
              <div className="relative p-4 h-full">
                <Sidebar pathname={pathname} onLogout={onLogout} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
