import { PrismaClient } from '@prisma/client';
import VideoGrid from '@/components/VideoGrid';
import PageHeader from '@/components/PageHeader';
import { serializeVideosForClient } from '@/lib/serializePrismaVideos';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export default async function ExplorePage() {
  // Mix of most-liked + recent to give a "discovery" feel
  const [popularRaw, recentRaw] = await Promise.all([
    prisma.video.findMany({
      orderBy: { likesCount: 'desc' },
      include: {
        channel: { select: { name: true, avatar: true } },
        property: true,
      },
      take: 8,
    }),
    prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        channel: { select: { name: true, avatar: true } },
        property: true,
      },
      skip: 2,
      take: 16,
    }),
  ]);

  // Interleave the two lists for variety
  const seen = new Set<string>();
  const popular = serializeVideosForClient(popularRaw);
  const recent = serializeVideosForClient(recentRaw);
  const mixed: any[] = [];
  const max = Math.max(popular.length, recent.length);
  for (let i = 0; i < max; i++) {
    const p = popular[i];
    const r = recent[i];
    if (p && !seen.has(p.id)) {
      mixed.push(p);
      seen.add(p.id);
    }
    if (r && !seen.has(r.id)) {
      mixed.push(r);
      seen.add(r.id);
    }
  }

  const display = mixed.length > 0 ? mixed : MOCK_EXPLORE;

  return (
    <div className="p-4 md:p-6 max-w-[2000px] mx-auto min-h-screen">
      <PageHeader
        iconName="Compass"
        iconColor="text-cyan-500"
        title="Explore"
        subtitle="Discover properties you haven't seen yet"
      />

      <VideoGrid videos={display as any} emptyMessage="Nothing to explore yet — check back soon!" />
    </div>
  );
}

const MOCK_EXPLORE = Array(12)
  .fill(0)
  .map((_, i) => ({
    id: `explore-${i}`,
    title: `Discover: ${['Coastal Villa', 'Mountain Retreat', 'Urban Loft', 'Desert Palace'][i % 4]} #${i + 1}`,
    thumbnailUrl: `https://images.unsplash.com/photo-${1600585154340 + i * 200}-9b5b3ad5fe7b?auto=format&fit=crop&q=80&w=800&h=450`,
    price: 1_500_000 + i * 300_000,
    city: ['Malibu', 'Aspen', 'Chicago', 'Dubai'][i % 4],
    country: ['USA', 'USA', 'USA', 'UAE'][i % 4],
    channelName: 'World Properties',
    viewsCount: 300_000 + i * 80_000,
    createdAt: new Date(Date.now() - i * 86_400_000 * 3),
    bedrooms: 3 + (i % 3),
    bathrooms: 2 + (i % 2),
    sizeSqm: 280 + i * 25,
    status: i % 2 === 0 ? ('FOR_SALE' as const) : ('FOR_RENT' as const),
  }));
