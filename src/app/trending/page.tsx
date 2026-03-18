import { PrismaClient } from '@prisma/client';
import VideoGrid from '@/components/VideoGrid';
import PageHeader from '@/components/PageHeader';
import { TrendingUp } from 'lucide-react';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export default async function TrendingPage() {
  // Sort by likesCount (most engagement) — viewsCount field does not exist in schema yet
  const videos = await prisma.video.findMany({
    orderBy: { likesCount: 'desc' },
    include: {
      channel: { select: { name: true, avatar: true } },
      property: true,
    },
    take: 24,
  });

  const display = videos.length > 0 ? videos : MOCK_TRENDING;

  return (
    <div className="p-4 md:p-6 max-w-[2000px] mx-auto min-h-screen">
      <PageHeader
        icon={TrendingUp}
        iconColor="text-orange-500"
        title="Trending"
        subtitle="Most-watched real estate tours globally right now"
      />

      <VideoGrid videos={display as any} emptyMessage="No trending videos yet" />
    </div>
  );
}

const MOCK_TRENDING = Array(12)
  .fill(0)
  .map((_, i) => ({
    id: `trending-${i}`,
    title: `Most-Viewed: ${['Mega Mansion', 'Sky Villa', 'Beachfront Estate', 'City Penthouse'][i % 4]} #${i + 1}`,
    thumbnailUrl: `https://images.unsplash.com/photo-${1600596542815 + i * 150}-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450`,
    price: 3_000_000 + i * 500_000,
    city: ['Dubai', 'Los Angeles', 'Monaco', 'Singapore'][i % 4],
    country: ['UAE', 'USA', 'France', 'Singapore'][i % 4],
    channelName: 'Global Estates',
    viewsCount: 10_000_000 - i * 500_000,
    createdAt: new Date(Date.now() - i * 86_400_000 * 2),
    bedrooms: 4 + (i % 4),
    bathrooms: 3 + (i % 3),
    sizeSqm: 400 + i * 40,
    status: i % 3 === 0 ? ('FOR_RENT' as const) : ('FOR_SALE' as const),
  }));
