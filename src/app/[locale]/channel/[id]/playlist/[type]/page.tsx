import type { Metadata } from "next";
import type { VideoPropertyType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";
import VideoCard from "@/components/VideoCard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { prefixWithLocale } from "@/i18n/routing";
import { localeFromParams, pageMetadata } from "@/i18n/seo";
import {
  CHANNEL_PLAYLIST_LABELS,
  CHANNEL_PUBLIC_VIDEO_WHERE,
  isChannelPlaylistType,
  playlistCategoryForVideo,
} from "@/lib/channel-playlists";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string; type: string }>;
}): Promise<Metadata> {
  const resolved = await localeFromParams(params);
  if (!resolved) return {};
  const { id: channelId, type: rawType } = await params;
  const requested = String(rawType || "").toUpperCase();
  if (!isChannelPlaylistType(requested)) return {};
  const playlistType = requested as VideoPropertyType;
  const channel = await safeFindFirst(() =>
    prisma.channel.findUnique({ where: { id: channelId }, select: { name: true } })
  );
  const path = `/channel/${channelId}/playlist/${requested}`;
  if (!channel) {
    return pageMetadata(resolved, path, {
      title: resolved === "ar" ? "القائمة غير موجودة" : "Playlist not found",
      noIndex: true,
    });
  }
  const label = CHANNEL_PLAYLIST_LABELS[playlistType];
  return pageMetadata(resolved, path, {
    title: `${label} — ${channel.name}`,
    description: `${label} • ${channel.name}`,
  });
}

export default async function ChannelPlaylistPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; type: string }>;
}) {
  const unwrappedParams = await params;
  const locale = (locales.includes(unwrappedParams.locale as Locale) ? unwrappedParams.locale : defaultLocale) as Locale;
  const channelId = unwrappedParams.id;
  const requested = String(unwrappedParams.type || "").toUpperCase();

  if (!isChannelPlaylistType(requested)) return notFound();
  const playlistType = requested as VideoPropertyType;

  const channel = await safeFindFirst(() =>
    prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        owner: true,
        videos: {
          where: { isShort: false, ...CHANNEL_PUBLIC_VIDEO_WHERE },
          include: { property: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  );

  if (!channel) return notFound();

  const videos = channel.videos.filter((v) => playlistCategoryForVideo(v) === playlistType);

  const profileImage = channel.profileImage ?? channel.avatar ?? undefined;

  return (
    <div className="w-full bg-[#0f0f0f] min-h-screen">
      <div className="max-w-[2000px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{CHANNEL_PLAYLIST_LABELS[playlistType]}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {channel.name} • {videos.length} video{videos.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href={prefixWithLocale(locale, `/channel/${channelId}?tab=playlists`)}
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
          >
            Back to channel
          </Link>
        </div>

        {videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                thumbnailUrl={video.thumbnail ?? undefined}
                videoUrl={video.videoUrl}
                price={Number(video.property?.price ?? 0)}
                currency={video.property?.currency || "USD"}
                location={
                  video.property ? `${video.property.city}, ${video.property.country}` : "Unknown location"
                }
                channelName={channel.name}
                channelAvatarUrl={profileImage}
                channelId={channel.id}
                viewsCount={video.viewsCount}
                createdAt={video.createdAt}
                bedrooms={video.property?.bedrooms ?? undefined}
                bathrooms={video.property?.bathrooms ?? undefined}
                sizeSqm={video.property?.sizeSqm ?? undefined}
                status={video.property?.status ?? undefined}
                isShort={false}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">No videos in this playlist yet.</div>
        )}
      </div>
    </div>
  );
}
