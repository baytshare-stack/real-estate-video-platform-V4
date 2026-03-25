import VideoCard from '@/components/VideoCard';
import ShortVideoPlayer from '@/components/shorts/ShortVideoPlayer';
import type { ShortVideoPayload } from '@/components/shorts/types';
import { Flame } from 'lucide-react';
import { getServerTranslation } from '@/i18n/server';
import PropertyMap from '@/components/PropertyMap';
import prisma from '@/lib/prisma';
import { safeFindMany } from '@/lib/safePrisma';

export const dynamic = 'force-dynamic';

// This is a Next.js Server Component, it fetches DB directly on the server
export default async function Home() {
  const { t } = await getServerTranslation();
  
  const videos = await safeFindMany(() =>
    prisma.video.findMany({
      where: { isShort: false },
      orderBy: { createdAt: 'desc' },
      include: {
        channel: { select: { id: true, name: true, avatar: true } },
        property: true
      },
      take: 16
    })
  );

  const shorts = await safeFindMany(() =>
    prisma.video.findMany({
      where: { isShort: true },
      orderBy: { createdAt: 'desc' },
      include: {
        channel: { select: { id: true, name: true, avatar: true } },
        property: true
      },
      take: 10
    })
  );

  // Since we might not have DB entries right away, fallback mock for visual continuity
  const displayVideos = videos.length > 0 ? videos : MOCK_VIDEOS;
  const displayShorts = shorts.length > 0 ? shorts : MOCK_SHORTS;
  const shortsPayload: ShortVideoPayload[] = displayShorts.map((short: any) => ({
    id: short.id,
    title: short.title,
    videoUrl: short.videoUrl ?? null,
    thumbnail: short.thumbnailUrl ?? short.thumbnail ?? null,
    channelId: short.channel?.id ?? short.channelId ?? "",
    channelName: short.channelName || short.channel?.name || "Channel",
    channelAvatar: short.channelAvatarUrl || short.channel?.avatar || null,
    viewsCount: short.viewsCount ?? 0,
    likesCount: short.likesCount ?? 0,
    dislikesCount: short.dislikesCount ?? 0,
    commentsCount: short.commentsCount ?? 0,
    sharesCount: short.sharesCount ?? 0,
    createdAt: short.createdAt ? new Date(short.createdAt).toISOString() : new Date().toISOString(),
    userReaction: null,
    subscribed: false,
  }));

  return (
    <div className="p-4 md:p-6 max-w-[2000px] mx-auto min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-white">{t('home', 'feedTitle')}</h1>
      {/* Filters Strip (Optional, similar to YouTube's top pills) */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 mb-2">
        {['All', 'Mansions', 'Apartments', 'Commercial', 'New York', 'Dubai', 'For Rent', 'Under $1M'].map(filter => (
          <button key={filter} className="whitespace-nowrap px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
            {filter}
          </button>
        ))}
      </div>

      {/* Main Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8 mb-10">
        {displayVideos.slice(0, 8).map((video: any) => (
          <VideoCard 
            key={video.id} 
            {...video} 
            thumbnailUrl={video.thumbnailUrl ?? video.thumbnail}
            price={video.property?.price ? Number(video.property.price) : video.price}
            currency={video.property?.currency || video.currency || "USD"}
            bedrooms={video.property?.bedrooms || video.bedrooms}
            bathrooms={video.property?.bathrooms || video.bathrooms}
              sizeSqm={video.property?.sizeSqm != null ? Number(video.property.sizeSqm) : video.sizeSqm != null ? Number(video.sizeSqm) : undefined}
            status={video.property?.status || video.status}
            channelId={video.channel?.id ?? video.channelId}
            channelName={video.channelName || video.channel?.name}
            channelAvatarUrl={video.channelAvatarUrl || video.channel?.avatar}
            location={`${video.property?.city || video.city}, ${video.property?.country || video.country || 'USA'}`}
          />
        ))}
      </div>

      {/* Shorts Shelf */}
      <div className="mb-10 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold">Shorts</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
          {shortsPayload.map((short) => (
            <ShortVideoPlayer
              key={short.id}
              video={short}
              mode="grid"
              className="w-[220px] flex-shrink-0"
            />
          ))}
        </div>
      </div>

      {/* Additional Video Grid */}
      {displayVideos.length > 8 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8 pb-10">
          {displayVideos.slice(8).map((video: any) => (
            <VideoCard 
              key={video.id} 
              {...video} 
              thumbnailUrl={video.thumbnailUrl ?? video.thumbnail}
              price={video.property?.price ? Number(video.property.price) : video.price}
              currency={video.property?.currency || video.currency || "USD"}
              bedrooms={video.property?.bedrooms || video.bedrooms}
              bathrooms={video.property?.bathrooms || video.bathrooms}
              sizeSqm={video.property?.sizeSqm != null ? Number(video.property.sizeSqm) : video.sizeSqm != null ? Number(video.sizeSqm) : undefined}
              status={video.property?.status || video.status}
              channelId={video.channel?.id ?? video.channelId}
              channelName={video.channelName || video.channel?.name}
              channelAvatarUrl={video.channelAvatarUrl || video.channel?.avatar}
              location={`${video.property?.city || video.city}, ${video.property?.country || video.country || 'USA'}`}
            />
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-white/10 pt-6">
        <h2 className="mb-4 text-xl font-bold text-white">Properties Map</h2>
        <div className="h-[420px] overflow-hidden rounded-2xl border border-white/10">
          <PropertyMap
            className="h-full w-full"
            videos={displayVideos.map((video: any) => ({
              id: video.id,
              title: video.title,
              price: video.property?.price ? Number(video.property.price) : video.price,
              currency: video.property?.currency || video.currency || "USD",
              thumbnailUrl: video.thumbnailUrl || video.thumbnail,
              latitude: video.property?.latitude ?? video.latitude,
              longitude: video.property?.longitude ?? video.longitude,
            }))}
          />
        </div>
      </div>

    </div>
  );
}

// Keep mocks at bottom so the UI continues to render perfectly while the DB is empty
const MOCK_VIDEOS = Array(12).fill(0).map((_, i) => ({
  id: `video-${i}`,
  title: `Luxury Modern Villa in Beverly Hills - Cinematic Tour ${i + 1}`,
  thumbnailUrl: `https://images.unsplash.com/photo-${1600596542815 + i}-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450`,
  price: 5400000 + (i * 100000),
  city: "Beverly Hills",
  country: "USA",
  channelName: "Luxury Estates",
  viewsCount: 15400 + (i * 5000),
  createdAt: new Date(Date.now() - (i * 86400000 * 5)),
  bedrooms: 5 + (i % 3),
  bathrooms: 4 + (i % 2),
  sizeSqm: 520 + (i * 50),
  status: i % 4 === 0 ? "FOR_RENT" as const : "FOR_SALE" as const
}));

const MOCK_SHORTS = Array(8).fill(0).map((_, i) => ({
  id: `short-${i}`,
  title: `Insane $20M Penthouse View! 🏙️ #${i + 1}`,
  thumbnailUrl: `https://images.unsplash.com/photo-${1512917774080 + i}-9991f1c4c750?auto=format&fit=crop&q=80&w=400&h=700`,
  price: 20000000,
  city: "New York",
  country: "USA",
  channelName: "NYC Realty",
  viewsCount: 1200000,
  createdAt: new Date(),
  bedrooms: 3,
  bathrooms: 3.5,
  sizeSqm: 300,
  status: "FOR_SALE" as const
}));
