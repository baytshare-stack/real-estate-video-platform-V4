"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import LocaleLink from "@/components/LocaleLink";
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Users,
  Settings,
  User,
  Plus,
  Heart,
  MessageCircle,
  Eye,
  Film,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Clapperboard,
  LogIn,
  CalendarClock,
} from "lucide-react";
import StatCard from "@/components/studio/StatCard";
import VideoRow, { type VideoRowData } from "@/components/studio/VideoRow";
import CrmLeadCard, { type CrmInteractor } from "@/components/studio/CrmLeadCard";
import ChannelSettingsTab from "@/components/studio/ChannelSettingsTab";
import StudioBookingsTable from "@/components/studio/StudioBookingsTable";
import FinalPriceLeadsPanel, { type FinalPriceLeadRow } from "@/components/studio/FinalPriceLeadsPanel";
import { useTranslation } from "@/i18n/LanguageProvider";

const ERR_SIGN_IN = "STUDIO_SIGN_IN";
const ERR_NO_CHANNEL = "STUDIO_NO_CHANNEL";

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

const TAB_IDS = ["overview", "content", "analytics", "crm", "bookings", "settings"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_ICONS: Record<TabId, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  content: Video,
  analytics: BarChart3,
  crm: Users,
  bookings: CalendarClock,
  settings: Settings,
};

export default function StudioPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [crm, setCrm] = useState<CrmInteractor[] | null>(null);
  const [finalPriceLeads, setFinalPriceLeads] = useState<FinalPriceLeadRow[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoRowData[]>([]);
  const [crmSearch, setCrmSearch] = useState("");

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const res = await fetch("/api/studio/overview");
      if (res.status === 401) {
        setOverviewError(ERR_SIGN_IN);
        return;
      }
      if (res.status === 404) {
        setOverviewError(ERR_NO_CHANNEL);
        return;
      }
      if (!res.ok) throw new Error("load");
      const data: OverviewData = await res.json();
      setOverview(data);
      setVideos(data.videos);
    } catch {
      setOverviewError(t("studio", "loadFailed"));
    } finally {
      setLoadingOverview(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && (TAB_IDS as readonly string[]).includes(tab)) {
      setActiveTab(tab as TabId);
    }
  }, []);

  const fetchCrm = useCallback(async () => {
    setLoadingCrm(true);
    try {
      const res = await fetch("/api/studio/crm");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCrm(data.interactors);
      setFinalPriceLeads(Array.isArray(data.finalPriceLeads) ? data.finalPriceLeads : []);
    } catch {
      setCrm([]);
      setFinalPriceLeads([]);
    } finally {
      setLoadingCrm(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "crm") fetchCrm();
  }, [activeTab, fetchCrm]);

  const handleVideoDeleted = (id: string) => setVideos((prev) => prev.filter((v) => v.id !== id));

  const q = crmSearch.toLowerCase().trim();
  const filteredCrm = (crm ?? []).filter((lead) => {
    if (!q) return true;
    const name = lead.user.fullName.toLowerCase();
    const email = lead.user.email.toLowerCase();
    if (name.includes(q) || email.includes(q)) return true;
    const tpl = lead.templateEvents ?? [];
    return tpl.some((ev) => ev.videoTitle.toLowerCase().includes(q) || ev.type.toLowerCase().includes(q));
  });

  const contentVideoCountLabel = useMemo(() => {
    const n = videos.length;
    const key = n === 1 ? "videoCount" : "videoCount_plural";
    return t("studio", `content.${key}`).replace("{{count}}", String(n));
  }, [videos.length, t]);

  const crmLeadCountLabel = useMemo(() => {
    const n = filteredCrm.length;
    const key = n === 1 ? "leadCount" : "leadCount_plural";
    return t("studio", `crm.${key}`).replace("{{count}}", String(n));
  }, [filteredCrm.length, t]);

  if (loadingOverview) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600/30 border-t-blue-600" />
          <p className="text-sm text-gray-400">{t("studio", "loadingStudio")}</p>
        </div>
      </div>
    );
  }

  if (overviewError === ERR_SIGN_IN) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10">
          <LogIn className="h-10 w-10 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{t("studio", "signInTitle")}</h1>
        <LocaleLink
          href="/login"
          className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
        >
          {t("studio", "signInCta")}
        </LocaleLink>
      </div>
    );
  }

  if (overviewError === ERR_NO_CHANNEL) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10">
          <Clapperboard className="h-10 w-10 text-purple-400" />
        </div>
        <div>
          <h1 className="mb-2 text-2xl font-bold text-white">{t("studio", "noChannelTitle")}</h1>
          <p className="max-w-sm text-sm text-gray-400">{t("studio", "noChannelBody")}</p>
        </div>
        <LocaleLink
          href="/create-channel"
          className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
        >
          {t("studio", "createChannel")}
        </LocaleLink>
      </div>
    );
  }

  if (overviewError && overviewError !== ERR_SIGN_IN && overviewError !== ERR_NO_CHANNEL) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-300">{overviewError}</p>
        <button
          type="button"
          onClick={fetchOverview}
          className="flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4" /> {t("studio", "tryAgain")}
        </button>
      </div>
    );
  }

  const { analytics, channel, ownerDefaults } = overview!;

  const engagementValue =
    analytics.totalVideos > 0
      ? `${((analytics.totalLikes + analytics.totalComments) / analytics.totalVideos).toFixed(1)}${t("studio", "analytics.perVideoSuffix")}`
      : "—";

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0f0f0f] text-white">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-e border-white/[0.07] bg-gray-950/80 xl:flex">
        <div className="border-b border-white/[0.07] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 text-lg font-bold text-white shadow-lg">
              {channel.profileImage ?? channel.avatar ? (
                <img
                  src={channel.profileImage ?? channel.avatar ?? ""}
                  alt={channel.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                channel.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold text-white">{channel.name}</p>
              <p className="text-xs text-gray-500">{t("studio", "creatorStudio")}</p>
            </div>
          </div>
          <LocaleLink
            href="/studio/profile"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
          >
            <User className="h-4 w-4 text-blue-400" />
            {t("studio", "myProfile")}
          </LocaleLink>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {TAB_IDS.map((tabId) => {
            const Icon = TAB_ICONS[tabId];
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-start text-sm font-medium transition-colors ${
                  isActive
                    ? "border border-blue-500/15 bg-blue-600/10 text-blue-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t("studio", `tabs.${tabId}`)}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.07] p-4">
          <LocaleLink
            href="/upload"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" /> {t("studio", "uploadVideo")}
          </LocaleLink>
        </div>
      </aside>

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] start-0 end-0 z-40 flex overflow-x-auto border-t border-white/[0.07] bg-gray-950/95 backdrop-blur-sm hide-scrollbar xl:hidden">
        {TAB_IDS.map((tabId) => {
          const Icon = TAB_ICONS[tabId];
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`flex flex-1 flex-col items-center gap-0.5 px-4 py-2 text-[10px] font-semibold transition-colors ${
                isActive ? "text-blue-400" : "text-gray-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              {t("studio", `tabs.${tabId}`)}
            </button>
          );
        })}
      </div>

      <main className="flex-1 overflow-y-auto p-4 pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] md:p-6 xl:p-8 xl:pb-8">
        <div className="mb-3 xl:hidden">
          <LocaleLink
            href="/studio/profile"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
          >
            <User className="h-4 w-4 text-blue-400" />
            {t("studio", "myProfile")}
          </LocaleLink>
        </div>

        {activeTab === "overview" && (
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-white">{t("studio", "overview.title")}</h1>
              <button
                type="button"
                onClick={fetchOverview}
                className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" /> {t("studio", "overview.refresh")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label={t("studio", "overview.statVideos")}
                value={analytics.totalVideos}
                icon={Film}
                iconBg="bg-purple-500/10"
                iconColor="text-purple-400"
                trend={t("studio", "overview.trendAllTime")}
              />
              <StatCard
                label={t("studio", "overview.statLikes")}
                value={analytics.totalLikes}
                icon={Heart}
                iconBg="bg-red-500/10"
                iconColor="text-red-400"
                trend={t("studio", "overview.trendAcrossVideos")}
                trendUp={analytics.totalLikes > 0}
              />
              <StatCard
                label={t("studio", "overview.statComments")}
                value={analytics.totalComments}
                icon={MessageCircle}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-400"
                trend={t("studio", "overview.trendEngagement")}
                trendUp={analytics.totalComments > 0}
              />
              <StatCard
                label={t("studio", "overview.statSubscribers")}
                value={analytics.totalSubscribers}
                icon={Users}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-400"
                trend={t("studio", "overview.trendSubscribersSoon")}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-gray-900/80 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
                <h2 className="text-lg font-bold">{t("studio", "overview.recentUploads")}</h2>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("content")}
                    className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
                  >
                    {t("studio", "overview.viewAll")}
                  </button>
                  <LocaleLink
                    href="/upload"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-500"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("studio", "upload")}
                  </LocaleLink>
                </div>
              </div>
              {videos.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  <Film className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p>{t("studio", "overview.noVideosYet")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[700px] w-full text-start">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-6 py-3">{t("studio", "overview.tableVideo")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableStatus")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableDate")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableLikes")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableComments")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableActions")}</th>
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

        {activeTab === "content" && (
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-white">{t("studio", "content.title")}</h1>
              <LocaleLink
                href="/upload"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" /> {t("studio", "uploadVideo")}
              </LocaleLink>
            </div>

            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <Film className="mx-auto mb-4 h-16 w-16 text-gray-700" />
                <p className="mb-1 text-lg font-semibold text-gray-400">{t("studio", "content.noVideosTitle")}</p>
                <p className="mb-6 text-sm text-gray-600">{t("studio", "content.noVideosBody")}</p>
                <LocaleLink
                  href="/upload"
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
                >
                  {t("studio", "content.uploadFirst")}
                </LocaleLink>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-gray-900/80 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
                  <p className="text-sm text-gray-400">{contentVideoCountLabel}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[700px] w-full text-start">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-6 py-3">{t("studio", "overview.tableVideo")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableStatus")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableDate")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableLikes")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableComments")}</th>
                        <th className="px-3 py-3">{t("studio", "overview.tableActions")}</th>
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

        {activeTab === "analytics" && (
          <div className="mx-auto max-w-5xl space-y-8">
            <h1 className="text-2xl font-black text-white">{t("studio", "analytics.title")}</h1>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label={t("studio", "analytics.statVideos")}
                value={analytics.totalVideos}
                icon={Film}
                iconBg="bg-purple-500/10"
                iconColor="text-purple-400"
              />
              <StatCard
                label={t("studio", "analytics.statLikes")}
                value={analytics.totalLikes}
                icon={Heart}
                iconBg="bg-red-500/10"
                iconColor="text-red-400"
                trendUp={analytics.totalLikes > 0}
              />
              <StatCard
                label={t("studio", "analytics.statComments")}
                value={analytics.totalComments}
                icon={MessageCircle}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-400"
                trendUp={analytics.totalComments > 0}
              />
              <StatCard
                label={t("studio", "analytics.statEngagement")}
                value={engagementValue}
                icon={TrendingUp}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-400"
              />
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-gray-900/80 p-6 shadow-xl">
              <h2 className="mb-6 text-lg font-bold">{t("studio", "analytics.perVideo")}</h2>
              {videos.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">{t("studio", "analytics.empty")}</p>
              ) : (
                <div className="space-y-5">
                  {videos.map((v) => {
                    const maxLikes = Math.max(...videos.map((x) => x.likesCount ?? 0), 1);
                    const maxComments = Math.max(...videos.map((x) => x.commentsCount ?? 0), 1);
                    const likesPct = Math.round(((v.likesCount ?? 0) / maxLikes) * 100);
                    const commentsPct = Math.round(((v.commentsCount ?? 0) / maxComments) * 100);
                    return (
                      <div key={v.id} className="group">
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="max-w-[55%] truncate text-sm font-medium text-white">{v.title}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3 text-red-400" />
                              {v.likesCount ?? 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3 text-blue-400" />
                              {v.commentsCount ?? 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-end text-[10px] text-gray-600">{t("studio", "analytics.barLikes")}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                              <div
                                className="h-full rounded-full bg-red-500/60 transition-all duration-700"
                                style={{ width: `${likesPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-end text-[10px] text-gray-600">{t("studio", "analytics.barComments")}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                              <div
                                className="h-full rounded-full bg-blue-500/60 transition-all duration-700"
                                style={{ width: `${commentsPct}%` }}
                              />
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

        {activeTab === "bookings" && (
          <div className="mx-auto max-w-6xl space-y-6">
            <div>
              <h1 className="text-2xl font-black text-white">{t("studio", "bookings.title")}</h1>
              <p className="mt-0.5 text-sm text-gray-400">{t("studio", "bookings.subtitle")}</p>
            </div>
            <StudioBookingsTable pollMs={5000} />
          </div>
        )}

        {activeTab === "crm" && (
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">{t("studio", "crm.title")}</h1>
                <p className="mt-0.5 text-sm text-gray-400">{t("studio", "crm.subtitle")}</p>
              </div>
              {crm && crm.length > 0 && (
                <div className="flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-gray-800/60 px-4 py-2.5 sm:w-72">
                  <Eye className="h-4 w-4 shrink-0 text-gray-500" />
                  <input
                    type="text"
                    placeholder={t("studio", "crm.searchPlaceholder")}
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                  />
                </div>
              )}
            </div>

            {loadingCrm ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600/30 border-t-blue-600" />
              </div>
            ) : (
              <>
                <FinalPriceLeadsPanel leads={finalPriceLeads} />

                {filteredCrm.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="mx-auto mb-4 h-16 w-16 text-gray-700" />
                    <p className="mb-1 text-lg font-semibold text-gray-400">
                      {crmSearch ? t("studio", "crm.noMatchTitle") : t("studio", "crm.emptyTitle")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {crmSearch ? t("studio", "crm.noMatchBody") : t("studio", "crm.emptyBody")}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">{crmLeadCountLabel}</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {filteredCrm.map((lead) => (
                        <CrmLeadCard key={lead.user.id} lead={lead} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="mx-auto max-w-2xl space-y-6">
            <ChannelSettingsTab channel={channel as never} ownerDefaults={ownerDefaults} onSaved={fetchOverview} />

            <div className="space-y-4 rounded-2xl border border-red-500/15 bg-gray-900/80 p-6 shadow-xl">
              <h2 className="border-b border-red-500/10 pb-3 text-base font-bold text-red-400">{t("studio", "dangerZone")}</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t("studio", "deleteChannel")}</p>
                  <p className="text-xs text-gray-500">{t("studio", "deleteChannelHint")}</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-red-500/20 bg-red-600/10 px-4 py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-600/20"
                >
                  {t("common", "delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
