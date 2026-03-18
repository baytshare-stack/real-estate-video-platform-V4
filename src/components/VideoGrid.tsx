import VideoCard from '@/components/VideoCard';

export interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  price?: number;
  location?: string;
  city?: string;
  country?: string;
  channelName?: string;
  channelAvatarUrl?: string;
  viewsCount: number;
  createdAt: Date | string;
  isShort?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  status?: 'FOR_SALE' | 'FOR_RENT';
  channel?: { name: string; avatar?: string | null };
  property?: {
    price?: number | bigint | null;
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
    price: v.property?.price ? Number(v.property.price) : (v.price ?? 0),
    bedrooms: v.property?.bedrooms ?? v.bedrooms,
    bathrooms: v.property?.bathrooms ?? v.bathrooms,
    sizeSqm: v.property?.sizeSqm ?? v.sizeSqm,
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
          return <VideoCard key={n.id} {...n} isShort={true} />;
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
