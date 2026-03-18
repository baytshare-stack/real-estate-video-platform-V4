import { PrismaClient } from '@prisma/client';
import VideoGrid from '@/components/VideoGrid';
import PageHeader from '@/components/PageHeader';
import { Users } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { serializeVideosForClient } from '@/lib/serializePrismaVideos';

const prisma = new PrismaClient();

export default async function SubscribersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center p-6">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Users className="w-10 h-10 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Sign in to see updates from your favorite channels</h1>
        <Link href="/login" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-full text-sm transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  // NOTE: Schema currently lacks a 'Subscription' model. 
  // For now, we show latest videos from all channels as a fallback.
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      channel: { select: { name: true, avatar: true } },
      property: true,
    },
    take: 20,
  });

  const serializedVideos = serializeVideosForClient(videos);

  return (
    <div className="p-4 md:p-6 max-w-[2000px] mx-auto min-h-screen">
      <PageHeader
        iconName="Users"
        iconColor="text-blue-500"
        title="Subscribers"
        subtitle="Latest updates from channels you follow"
      />

      <div className="mb-8 p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
        <div className="p-2 bg-blue-600/20 rounded-xl">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Personalized Feed Coming Soon</p>
          <p className="text-blue-400/80 text-xs">We are currently showing updates from all channels. Personalized subscription filtering will be enabled in the next update.</p>
        </div>
      </div>

      <VideoGrid videos={serializedVideos as any} emptyMessage="No videos found from your subscriptions." />
    </div>
  );
}
