import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { channel: true },
  });

  if (!user?.channel) {
    return NextResponse.json({ error: 'No channel found' }, { status: 404 });
  }

  const channelId = user.channel.id;

  // Fetch all videos with comments/likes counts
  const videos = await prisma.video.findMany({
    where: { channelId },
    include: {
      property: true,
      _count: { select: { comments: true, likes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalLikes = videos.reduce((acc, v) => acc + (v.likesCount ?? 0), 0);
  const totalComments = videos.reduce((acc, v) => acc + v._count.comments, 0);

  return NextResponse.json({
    channel: {
      id: user.channel.id,
      name: user.channel.name,
      description: user.channel.description,
      avatar: user.channel.avatar,
      // New Creator Studio fields (may be null if not set yet).
      ...(user.channel as any),
    },
    analytics: {
      totalVideos: videos.length,
      totalLikes,
      totalComments,
      // Subscriber count not in schema yet — return 0 as placeholder
      totalSubscribers: 0,
    },
    videos: videos.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnail: v.thumbnail,
      videoUrl: v.videoUrl,
      likesCount: v.likesCount,
      commentsCount: v._count.comments,
      createdAt: v.createdAt,
      property: v.property ? {
        propertyType: v.property.propertyType,
        status: v.property.status,
        price: v.property.price?.toString(),
        city: v.property.city,
        country: v.property.country,
      } : null,
    })),
  });
}
