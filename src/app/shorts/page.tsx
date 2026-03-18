import { PrismaClient } from '@prisma/client';
import VideoGrid from '@/components/VideoGrid';
import PageHeader from '@/components/PageHeader';
import { serializeVideosForClient } from '@/lib/serializePrismaVideos';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export default async function ShortsPage() {
  // The current schema doesn't have an isShort flag, so we serve the
  // most-recent short-format mock videos alongside real ones from the DB.
  // When the schema is extended with `isShort Boolean @default(false)`,
  // swap the query below to:  where: { isShort: true }
  const dbVideos = await prisma.video.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      channel: { select: { name: true, avatar: true } },
      property: true,
    },
    take: 8,
  });

  const serializedDbVideos = serializeVideosForClient(dbVideos).map((v) => ({
    ...v,
    isShort: true,
  }));

  const display =
    serializedDbVideos.length > 0 ? [...serializedDbVideos, ...MOCK_SHORTS] : MOCK_SHORTS;

  return (
    <div className="p-4 md:p-6 max-w-[2000px] mx-auto min-h-screen">
      <PageHeader
        iconName="Clapperboard"
        iconColor="text-red-500"
        title="Shorts"
        subtitle="Bite-sized real-estate tours under 60 seconds"
      />

      <VideoGrid videos={display as any} shortsMode={true} emptyMessage="No Shorts available yet" />
    </div>
  );
}

const MOCK_SHORTS = Array(12)
  .fill(0)
  .map((_, i) => ({
    id: `short-${i}`,
    title: `🏙️ Insane $${(i + 1) * 5}M Penthouse Tour #${i + 1}`,
    thumbnailUrl: `https://images.unsplash.com/photo-${1512917774080 + i * 100}-9991f1c4c750?auto=format&fit=crop&q=80&w=400&h=700`,
    price: (i + 1) * 5_000_000,
    city: ['New York', 'Dubai', 'Paris', 'London'][i % 4],
    country: ['USA', 'UAE', 'France', 'UK'][i % 4],
    channelName: 'Luxury Shorts',
    viewsCount: 2_100_000 + i * 500_000,
    createdAt: new Date(Date.now() - i * 86_400_000),
    bedrooms: 3 + (i % 3),
    bathrooms: 2 + (i % 2),
    sizeSqm: 200 + i * 30,
    status: i % 2 === 0 ? ('FOR_SALE' as const) : ('FOR_RENT' as const),
    isShort: true,
  }));
