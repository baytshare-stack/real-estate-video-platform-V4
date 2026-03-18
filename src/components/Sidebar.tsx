"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Flame, PlaySquare, Compass, TrendingUp, Users, 
  Settings, HelpCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
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
    { name: t('nav', 'home'), href: '/', icon: Home },
    { name: 'Shorts', href: '/shorts', icon: Flame },
    { name: 'Subscribers', href: '/subscribers', icon: Users },
    { name: 'Subscriptions', href: '/subscriptions', icon: PlaySquare },
    { name: 'Explore', href: '/explore', icon: Compass },
    { name: 'Trending', href: '/trending', icon: TrendingUp },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside 
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-[#0f0f0f] border-r border-white/10 overflow-y-auto hide-scrollbar hidden xl:flex flex-col py-3 z-40 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="flex flex-col gap-1 px-3">
          {navItems.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
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

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-950/95 backdrop-blur-md border-t border-white/10 z-50 flex items-center justify-around px-2">
        {navItems.slice(0, 4).map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{link.name}</span>
            </Link>
          );
        })}
        <Link href="/studio" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${pathname === '/studio' ? 'text-blue-400' : 'text-gray-500'}`}>
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Studio</span>
        </Link>
      </nav>
    </>
  );
}
