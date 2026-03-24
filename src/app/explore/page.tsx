import VideoGrid from '@/components/VideoGrid';
import PageHeader from '@/components/PageHeader';
import { serializeVideosForClient } from '@/lib/serializePrismaVideos';
import prisma from '@/lib/prisma';
import { safeFindMany } from '@/lib/safePrisma';

export const dynamic = 'force-dynamic';

export default async function ExplorePage() {
  // Mix of most-liked + recent to give a "discovery" feel
  let popularRaw: Awaited<ReturnType<typeof prisma.video.findMany>> = [];
  let recentRaw: Awaited<ReturnType<typeof prisma.video.findMany>> = [];
  try {
    [popularRaw, recentRaw] = await Promise.all([
      safeFindMany(() =>
        prisma.video.findMany({
          orderBy: { likesCount: 'desc' },
          include: {
            channel: { select: { name: true, avatar: true } },
            property: true,
          },
          take: 8,
        })
      ),
      safeFindMany(() =>
        prisma.video.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            channel: { select: { name: true, avatar: true } },
            property: true,
          },
          skip: 2,
          take: 16,
        })
      ),
    ]);
  } catch (e) {
    console.error("[ExplorePage]", e);
  }

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
      seen.add(p.id);
      mixed.push(p);
    }
    if (r && !seen.has(r.id)) {
      seen.add(r.id);
      mixed.push(r);
    }
  }

  const display = mixed.length > 0 ? mixed : MOCK_EXPLORE;

  return (
    <div className="p-4 md:p-6 max-w-[2000px] mx-auto min-h-screen">
      <PageHeader
        iconName="Compass"
        iconColor="text-purple-500"
        title="Explore"
        subtitle="Discover incredible properties from around the world"
      />

      <VideoGrid videos={display as any} emptyMessage="No videos to explore yet" />
    </div>
  );
}

const MOCK_EXPLORE = Array(8).fill(0).map((_, i) => ({
  id: `explore-${i}`,
  title: `Explore property tour ${i + 1}`,
  thumbnailUrl: `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450`,
  price: 1200000 + i * 50000,
  city: "Miami",
  country: "USA",
  channelName: "Explore Channel",
  viewsCount: 5000 + i * 100,
  createdAt: new Date(),
  bedrooms: 3,
  bathrooms: 2,
  sizeSqm: 180,
  status: "FOR_SALE" as const,
}));
