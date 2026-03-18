"use client";

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Search, Bell, Video, UserCircle, Menu, LogOut, X, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/LanguageProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Header() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Close search on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileSearchOpen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get('q');
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q.toString())}`);
      setMobileSearchOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f0f0f] border-b border-white/10 z-50 flex items-center justify-between px-4">
      {/* ── Left ── */}
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors hidden xl:block">
          <Menu className="w-6 h-6 text-white" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/20">
            R
          </div>
          <span className="text-xl font-black tracking-tighter text-white hidden sm:block uppercase">RealEstateTV</span>
        </Link>
      </div>

      {/* ── Desktop Search ── */}
      <div className="flex-1 max-w-2xl px-8 hidden md:flex items-center">
        <form onSubmit={handleSearch} className="flex w-full overflow-hidden border border-white/15 rounded-full focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 bg-[#121212] transition-all">
          <input 
            type="text"
            name="q" 
            placeholder={t('search', 'placeholder')}
            className="w-full bg-transparent px-5 py-2.5 text-white outline-none placeholder:text-gray-600 text-sm"
          />
          <button type="submit" className="px-6 bg-white/5 hover:bg-white/10 border-l border-white/10 flex items-center justify-center transition-colors">
            <Search className="w-4 h-4 text-gray-400" />
          </button>
        </form>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-1.5 sm:gap-4">
        <button 
          onClick={() => setMobileSearchOpen(true)}
          className="md:hidden p-2.5 hover:bg-white/10 rounded-full transition-colors text-gray-400"
        >
          <Search className="w-5 h-5" />
        </button>
        
        <Link href="/upload" className="flex items-center gap-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 px-4 py-2 rounded-full text-xs font-bold transition-all border border-blue-500/20 hidden sm:flex">
          <Video className="w-3.5 h-3.5" />
          <span>{t('nav', 'upload')}</span>
        </Link>

        <LanguageSwitcher />

        {status === "loading" ? (
          <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse tracking-widest px-8"></div>
        ) : session ? (
          <div className="flex items-center gap-3">
             <Link href="/studio" className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold hover:scale-105 transition-transform shadow-lg shadow-blue-500/20">
                {session.user?.name?.charAt(0) || 'U'}
             </Link>
             <button onClick={() => signOut()} className="p-2 hover:bg-red-500/10 rounded-full transition-colors hidden sm:block text-gray-400 hover:text-red-400" title="Sign Out">
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        ) : (
          <Link href="/login" className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 transition-colors px-5 py-2 rounded-full text-xs font-black uppercase">
            <UserCircle className="w-4 h-4" />
            {t('nav', 'login')}
          </Link>
        )}
      </div>

      {/* ── Mobile Search Overlay ── */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 bg-[#0f0f0f] z-[60] flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="h-16 flex items-center gap-2 px-4 border-b border-white/10">
            <button onClick={() => setMobileSearchOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <form onSubmit={handleSearch} className="flex-1 flex items-center bg-gray-900 rounded-full px-4 py-1.5 border border-white/10">
              <input 
                autoFocus
                type="text"
                name="q"
                placeholder={t('search', 'placeholder')}
                className="w-full bg-transparent text-white outline-none placeholder:text-gray-600"
              />
              <button type="submit" className="p-1.5 text-gray-400">
                <Search className="w-5 h-5" />
              </button>
            </form>
            <button onClick={() => setMobileSearchOpen(false)} className="p-2 text-gray-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 text-gray-500 text-sm italic">
            Press enter to search for real estate videos...
          </div>
        </div>
      )}
    </header>
  );
}
