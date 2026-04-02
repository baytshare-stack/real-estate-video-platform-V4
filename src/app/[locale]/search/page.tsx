import SearchClient from './SearchClient';
import { serializeVideosForClient } from '@/lib/serializePrismaVideos';
import prisma from '@/lib/prisma';
import { safeFindMany } from '@/lib/safePrisma';

export const dynamic = 'force-dynamic';

export default async function SearchAndMapPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const unwrappedParams = await searchParams;
  const query = unwrappedParams.q || '';

  const searchResults = await safeFindMany(() =>
    prisma.video.findMany({
      where: query
        ? {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
              { property: { city: { contains: query } } },
              { property: { country: { contains: query } } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
      include: {
        channel: { select: { name: true, avatar: true } },
        property: true,
      },
      take: 30,
    })
  );

  const serializedVideos = serializeVideosForClient(searchResults);

  return <SearchClient initialVideos={serializedVideos} initialQuery={query} />;
}
