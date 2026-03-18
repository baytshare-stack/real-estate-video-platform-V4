import { PrismaClient } from '@prisma/client';
import SearchClient from './SearchClient';
import { serializeVideosForClient } from '@/lib/serializePrismaVideos';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function SearchAndMapPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const unwrappedParams = await searchParams;
  const query = unwrappedParams.q || '';

  // Extract query filters conceptually, e.g., if q matches 'Miami'
  // In a real sophisticated query we'd do full-text search on title/city/description
  const searchResults = await prisma.video.findMany({
    where: query ? {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { property: { city: { contains: query } } },
        { property: { country: { contains: query } } }
      ]
    } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      channel: { select: { name: true, avatar: true }},
      property: true
    },
    take: 30
  });

  const serializedVideos = serializeVideosForClient(searchResults);

  return (
    <SearchClient initialVideos={serializedVideos} initialQuery={query} />
  );
}
