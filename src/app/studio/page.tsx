"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Video, BarChart3, Users, Settings, User,
  Plus, Heart, MessageCircle, Eye, Film, TrendingUp, RefreshCw,
  AlertCircle, Clapperboard, LogIn
} from 'lucide-react';
import StatCard from '@/components/studio/StatCard';
import VideoRow, { type VideoRowData } from '@/components/studio/VideoRow';
import CrmLeadCard, { type CrmInteractor } from '@/components/studio/CrmLeadCard';
import ChannelSettingsTab from '@/components/studio/ChannelSettingsTab';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OverviewData {
  channel: {
    id: string;
    name: string;
    description: string | null;
    avatar: string | null;
    profileImage?: string | null;
    bannerImage?: string | null;
    country?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    whatsappUrl?: string | null;
    facebookUrl?: string | null;
    instagramUrl?: string | null;
    telegramUrl?: string | null;
    youtubeUrl?: string | null;
    websiteUrl?: string | null;
  };
  ownerDefaults?: {
    country?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  };
  analytics: { totalVideos: number; totalLikes: number; totalComments: number; totalSubscribers: number };
  videos: VideoRowData[];
}

// ─── Tab list ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   icon: LayoutDashboard, label: 'Overview'  },
  { id: 'content',    icon: Video,           label: 'Content'   },
  { id: 'analytics',  icon: BarChart3,        label: 'Analytics' },
  { id: 'crm',        icon: Users,           label: 'CRM'       },
  { id: 'settings',   icon: Settings,        label: 'Settings'  },
];

// ─── Root Page ────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [crm, setCrm] = useState<CrmInteractor[] | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoRowData[]>([]);
  const [crmSearch, setCrmSearch] = useState('');

  // ── Fetch overview once ──
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const res = await fetch('/api/studio/overview');
      if (res.status === 401) { setOverviewError('Please sign in to access your studio.'); return; }
      if (res.status === 404) { setOverviewError('no_channel'); return; }
      if (!res.ok) throw new Error('Failed to load studio data');
      const data: OverviewData = await res.json();
      setOverview(data);
      setVideos(data.videos);
    } catch {
      setOverviewError('Failed to load studio data. Please try again.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // ── Lazy-load CRM when tab opened ──
  const fetchCrm = useCallback(async () => {
    if (crm !== null) return;
    setLoadingCrm(true);
    try {
      const res = await fetch('/api/studio/crm');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCrm(data.interactors);
    } catch {
      setCrm([]);
    } finally {
      setLoadingCrm(false);
    }
  }, [crm]);

  useEffect(() => {
    if (activeTab === 'crm') fetchCrm();
  }, [activeTab, fetchCrm]);

  const handleVideoDeleted = (id: string) => setVideos(prev => prev.filter(v => v.id !== id));

  const filteredCrm = (crm ?? []).filter(lead =>
    lead.user.fullName.toLowerCase().includes(crmSearch.toLowerCase()) ||
    lead.user.email.toLowerCase().includes(crmSearch.toLowerCase())
  );

  // ─── Error / Loading states ─────────────────────────────────────────────────
  if (loadingOverview) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your studio…</p>
        </div>
      </div>
    );
  }

  if (overviewError === 'Please sign in to access your studio.') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center p-6">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
          <LogIn className="w-10 h-10 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Sign in to access Creator Studio</h1>
        <Link href="/login" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-full text-sm transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  if (overviewError === 'no_channel') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center p-6">
        <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center">
          <Clapperboard className="w-10 h-10 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">No Channel Yet</h1>
          <p className="text-gray-400 text-sm max-w-sm">Create your channel to start uploading property tours and growing your audience.</p>
        </div>
        <Link href="/create-channel" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-full text-sm transition-colors">
          Create Channel
        </Link>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center p-6">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-300">{overviewError}</p>
        <button onClick={fetchOverview} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const { analytics, channel, ownerDefaults } = overview!;

  // ─── Main Dashboard Layout ──────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#0f0f0f] text-white overflow-hidden">

      {/* ── Studio Sidebar ── */}
      <aside className="w-64 bg-gray-950/80 border-r border-white/[0.07] flex flex-col hidden xl:flex flex-shrink-0">
        {/* Channel identity */}
        <div className="p-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg">
              {channel.profileImage ?? channel.avatar
                ? <img src={channel.profileImage ?? channel.avatar ?? ''} alt={channel.name} className="w-full h-full object-cover" />
                : channel.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm truncate">{channel.name}</p>
              <p className="text-gray-500 text-xs">Creator Studio</p>
            </div>
          </div>
          <Link
            href="/studio/profile"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
          >
            <User className="h-4 w-4 text-blue-400" />
            My Profile
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors text-left
                  ${isActive ? 'bg-blue-600/10 text-blue-400 border border-blue-500/15' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Footer quick-upload */}
        <div className="p-4 border-t border-white/[0.07]">
          <Link
            href="/upload"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Upload Video
          </Link>
        </div>
      </aside>

      {/* ── Mobile Tab Bar ── */}
      <div className="xl:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 flex overflow-x-auto hide-scrollbar border-t border-white/[0.07] bg-gray-950/95 backdrop-blur-sm">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 flex-1 text-[10px] font-semibold transition-colors ${isActive ? 'text-blue-400' : 'text-gray-600'}`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto p-4 pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] md:p-6 xl:pb-8 xl:p-8">
        <div className="mb-3 xl:hidden">
          <Link
            href="/studio/profile"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
          >
            <User className="h-4 w-4 text-blue-400" />
            My Profile
          </Link>
        </div>

        {/* ════ TAB: OVERVIEW ════ */}
        {activeTab === 'overview' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-white">Channel Overview</h1>
              <button onClick={fetchOverview} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Analytics stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Videos"      value={analytics.totalVideos}      icon={Film}           iconBg="bg-purple-500/10" iconColor="text-purple-400" trend="All time" />
              <StatCard label="Total Likes"       value={analytics.totalLikes}       icon={Heart}          iconBg="bg-red-500/10"    iconColor="text-red-400"    trend="Across all videos" trendUp={analytics.totalLikes > 0} />
              <StatCard label="Total Comments"    value={analytics.totalComments}    icon={MessageCircle}  iconBg="bg-blue-500/10"   iconColor="text-blue-400"   trend="Engagement count" trendUp={analytics.totalComments > 0} />
              <StatCard label="Subscribers"       value={analytics.totalSubscribers} icon={Users}          iconBg="bg-emerald-500/10" iconColor="text-emerald-400" trend="Coming soon" />
            </div>

            {/* Recent uploads preview */}
            <div className="bg-gray-900/80 border border-white/[0.07] rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
                <h2 className="font-bold text-lg">Recent Uploads</h2>
                <div className="flex gap-3">
                  <button onClick={() => setActiveTab('content')} className="text-blue-400 text-sm hover:text-blue-300 transition-colors font-medium">
                    View all →
                  </button>
                  <Link href="/upload" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Upload
                  </Link>
                </div>
              </div>
              {videos.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  <Film className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No videos yet. Upload your first property tour!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/[0.07]">
                        <th className="px-6 py-3 font-semibold">Video</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold">Date</th>
                        <th className="px-3 py-3 font-semibold">Likes</th>
                        <th className="px-3 py-3 font-semibold">Comments</th>
                        <th className="px-3 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.slice(0, 5).map((v) => (
                        <VideoRow key={v.id} video={v} onDeleted={handleVideoDeleted} index={0} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ TAB: CONTENT ════ */}
        {activeTab === 'content' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-white">Content Library</h1>
              <Link href="/upload" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
                <Plus className="w-4 h-4" /> Upload Video
              </Link>
            </div>

            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <Film className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-400 text-lg font-semibold mb-1">No videos yet</p>
                <p className="text-gray-600 text-sm mb-6">Your uploaded property tours will appear here.</p>
                <Link href="/upload" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
                  Upload Your First Video
                </Link>
              </div>
            ) : (
              <div className="bg-gray-900/80 border border-white/[0.07] rounded-2xl shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
                  <p className="text-gray-400 text-sm">{videos.length} video{videos.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/[0.07]">
                        <th className="px-6 py-3 font-semibold">Video</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold">Date</th>
                        <th className="px-3 py-3 font-semibold">Likes</th>
                        <th className="px-3 py-3 font-semibold">Comments</th>
                        <th className="px-3 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map((v) => (
                        <VideoRow key={v.id} video={v} onDeleted={handleVideoDeleted} index={0} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: ANALYTICS ════ */}
        {activeTab === 'analytics' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="text-2xl font-black text-white">Analytics</h1>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Videos"       value={analytics.totalVideos}     icon={Film}          iconBg="bg-purple-500/10"  iconColor="text-purple-400" />
              <StatCard label="Total Likes"  value={analytics.totalLikes}      icon={Heart}         iconBg="bg-red-500/10"     iconColor="text-red-400"    trendUp={analytics.totalLikes > 0} />
              <StatCard label="Comments"     value={analytics.totalComments}   icon={MessageCircle} iconBg="bg-blue-500/10"    iconColor="text-blue-400"   trendUp={analytics.totalComments > 0} />
              <StatCard label="Engagement"   value={analytics.totalVideos > 0 ? `${((analytics.totalLikes + analytics.totalComments) / analytics.totalVideos).toFixed(1)}/vid` : '—'} icon={TrendingUp} iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
            </div>

            {/* Per-video performance bars */}
            <div className="bg-gray-900/80 border border-white/[0.07] rounded-2xl p-6 shadow-xl">
              <h2 className="font-bold text-lg mb-6">Performance per Video</h2>
              {videos.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No videos to analyse yet.</p>
              ) : (
                <div className="space-y-5">
                  {videos.map(v => {
                    const maxLikes = Math.max(...videos.map(x => x.likesCount ?? 0), 1);
                    const maxComments = Math.max(...videos.map(x => x.commentsCount ?? 0), 1);
                    const likesPct = Math.round(((v.likesCount ?? 0) / maxLikes) * 100);
                    const commentsPct = Math.round(((v.commentsCount ?? 0) / maxComments) * 100);
                    return (
                      <div key={v.id} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-white text-sm font-medium truncate max-w-[55%]">{v.title}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{v.likesCount ?? 0}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{v.commentsCount ?? 0}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-600 w-14 text-right">Likes</span>
                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500/60 rounded-full transition-all duration-700" style={{ width: `${likesPct}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-600 w-14 text-right">Comments</span>
                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500/60 rounded-full transition-all duration-700" style={{ width: `${commentsPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ TAB: CRM ════ */}
        {activeTab === 'crm' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">CRM — Lead Management</h1>
                <p className="text-gray-400 text-sm mt-0.5">Users who interacted with your videos</p>
              </div>
              {crm && crm.length > 0 && (
                <div className="flex items-center gap-2 bg-gray-800/60 border border-white/[0.08] rounded-xl px-4 py-2.5 w-full sm:w-72">
                  <Eye className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search leads…"
                    value={crmSearch}
                    onChange={e => setCrmSearch(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
                  />
                </div>
              )}
            </div>

            {loadingCrm ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : filteredCrm.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-400 text-lg font-semibold mb-1">
                  {crmSearch ? 'No leads match your search' : 'No interactions yet'}
                </p>
                <p className="text-gray-600 text-sm">
                  {crmSearch
                    ? 'Try a different name or email.'
                    : 'When users subscribe, like, or comment on your videos, they appear here as leads.'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-sm">{filteredCrm.length} lead{filteredCrm.length !== 1 ? 's' : ''}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCrm.map(lead => (
                    <CrmLeadCard key={lead.user.id} lead={lead} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ TAB: SETTINGS ════ */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <ChannelSettingsTab channel={channel as any} ownerDefaults={ownerDefaults} onSaved={fetchOverview} />

            {/* Danger zone */}
            <div className="bg-gray-900/80 border border-red-500/15 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="font-bold text-base text-red-400 border-b border-red-500/10 pb-3">Danger Zone</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold">Delete Channel</p>
                  <p className="text-gray-500 text-xs">Permanently remove your channel and all videos.</p>
                </div>
                <button className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-bold text-xs px-4 py-2 rounded-xl transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
