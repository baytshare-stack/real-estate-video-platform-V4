import VideoCard from '@/components/VideoCard';
import ShortVideoPlayer from '@/components/shorts/ShortVideoPlayer';
import type { ShortVideoPayload } from '@/components/shorts/types';

export interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  price?: number;
  location?: string;
  city?: string;
  country?: string;
  channelName?: string;
  channelAvatarUrl?: string;
  viewsCount: number;
  createdAt: Date | string;
  isShort?: boolean;
  videoUrl?: string | null;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  status?: 'FOR_SALE' | 'FOR_RENT';
  channel?: { name: string; avatar?: string | null };
  property?: {
    price?: number | bigint | null;
    currency?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    sizeSqm?: number | null;
    status?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
}

interface VideoGridProps {
  videos: VideoItem[];
  shortsMode?: boolean;
  emptyMessage?: string;
}

function normalise(v: VideoItem) {
  return {
    ...v,
    thumbnailUrl: v.thumbnailUrl ?? v.thumbnail ?? undefined,
    videoUrl: v.videoUrl ?? undefined,
    price: v.property?.price ? Number(v.property.price) : (v.price ?? 0),
    currency: v.property?.currency ?? v.currency ?? "USD",
    bedrooms: v.property?.bedrooms ?? v.bedrooms,
    bathrooms: v.property?.bathrooms ?? v.bathrooms,
    sizeSqm:
      v.property?.sizeSqm !== null && v.property?.sizeSqm !== undefined
        ? Number(v.property.sizeSqm)
        : v.sizeSqm !== null && v.sizeSqm !== undefined
          ? Number(v.sizeSqm)
          : undefined,
    status: (v.property?.status ?? v.status) as 'FOR_SALE' | 'FOR_RENT' | undefined,
    channelName: v.channelName ?? v.channel?.name ?? 'Unknown',
    channelAvatarUrl: v.channelAvatarUrl ?? v.channel?.avatar ?? undefined,
    location: v.location ?? `${v.property?.city ?? v.city ?? ''}, ${v.property?.country ?? v.country ?? ''}`.replace(/^, |, $/, ''),
    createdAt: new Date(v.createdAt),
  };
}

export default function VideoGrid({ videos, shortsMode = false, emptyMessage }: VideoGridProps) {
  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 text-4xl">🏠</div>
        <p className="text-gray-400 text-lg font-medium">{emptyMessage ?? 'No videos found'}</p>
        <p className="text-gray-600 text-sm mt-1">Check back later for new listings.</p>
      </div>
    );
  }

  if (shortsMode) {
    return (
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
        {videos.map((v) => {
          const n = normalise(v);
          const shortPayload: ShortVideoPayload = {
            id: n.id,
            title: n.title,
            videoUrl: n.videoUrl ?? null,
            thumbnail: n.thumbnailUrl ?? null,
            channelId: "demo",
            channelName: n.channelName ?? "Channel",
            channelAvatar: n.channelAvatarUrl ?? null,
            viewsCount: n.viewsCount ?? 0,
            likesCount: 0,
            dislikesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            createdAt: new Date(n.createdAt).toISOString(),
            userReaction: null,
            subscribed: false,
          };
          return (
            <ShortVideoPlayer
              key={n.id}
              video={shortPayload}
              mode="grid"
              className="w-[220px] flex-shrink-0"
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8">
      {videos.map((v) => {
        const n = normalise(v);
        return <VideoCard key={n.id} {...n} />;
      })}
    </div>
  );
}
