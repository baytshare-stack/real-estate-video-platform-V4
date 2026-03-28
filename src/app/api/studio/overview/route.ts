import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { safeFindMany, safeFindUnique } from '@/lib/safePrisma';
import type { Prisma } from '@prisma/client';

type UserWithChannel = Prisma.UserGetPayload<{ include: { channel: true } }>;

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = (await safeFindUnique(() =>
    prisma.user.findUnique({
      where: { email },
      include: { channel: true },
    })
  )) as UserWithChannel | null;

  if (!user?.channel) {
    return NextResponse.json({ error: 'No channel found' }, { status: 404 });
  }

  const channelId = user.channel.id;

  const videos = await safeFindMany(() =>
    prisma.video.findMany({
      where: { channelId },
      include: {
        property: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  );

  const totalLikes = videos.reduce((acc, v) => acc + (v.likesCount ?? 0), 0);
  const totalComments = videos.reduce((acc, v) => acc + (v.commentsCount ?? 0), 0);

  const digitsToPlus = (d: string | null | undefined) => {
    if (!d) return null;
    const x = d.replace(/\D/g, "");
    return x ? `+${x}` : null;
  };

  return NextResponse.json({
    channel: {
      id: user.channel.id,
      name: user.channel.name,
      description: user.channel.description,
      avatar: user.channel.avatar,
      ...(user.channel as any),
    },
    ownerDefaults: {
      country: user.country,
      phone: user.fullPhoneNumber || digitsToPlus(user.phone),
      whatsapp: digitsToPlus(user.whatsapp),
    },
    analytics: {
      totalVideos: videos.length,
      totalLikes,
      totalComments,
      totalSubscribers: 0,
    },
    videos: videos.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnail: v.thumbnail,
      thumbnailUrl: v.thumbnail,
      videoUrl: v.videoUrl,
      isShort: v.isShort,
      likesCount: v.likesCount,
      commentsCount: v.commentsCount ?? 0,
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
