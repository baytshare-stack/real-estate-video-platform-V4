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

  const likers = await safeFindMany(() =>
    prisma.videoReaction.findMany({
      where: { video: { channelId }, type: "LIKE" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            country: true,
            phoneNumber: true,
            phoneCode: true,
            phone: true,
            fullPhoneNumber: true,
            role: true,
          },
        },
        video: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  );

  const commenters = await safeFindMany(() =>
    prisma.comment.findMany({
      where: { video: { channelId } },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            country: true,
            phoneNumber: true,
            phoneCode: true,
            phone: true,
            fullPhoneNumber: true,
            role: true,
          },
        },
        video: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  );

  type MapEntry = {
    user: {
      id: string;
      fullName: string;
      email: string;
      country: string | null;
      phoneNumber: string | null;
      phoneCode: string | null;
      phone: string | null;
      fullPhoneNumber: string | null;
      role: string;
    };
    likes: { videoTitle: string }[];
    comments: { videoTitle: string; content?: string }[];
    isSubscriber: boolean;
  };

  const interactorMap = new Map<string, MapEntry>();

  for (const l of likers) {
    const existing = interactorMap.get(l.user.id);
    if (existing) {
      existing.likes.push({ videoTitle: l.video.title });
    } else {
      interactorMap.set(l.user.id, {
        user: l.user,
        likes: [{ videoTitle: l.video.title }],
        comments: [],
        isSubscriber: false,
      });
    }
  }

  for (const c of commenters) {
    const existing = interactorMap.get(c.user.id);
    if (existing) {
      existing.comments.push({ videoTitle: c.video.title });
    } else {
      interactorMap.set(c.user.id, {
        user: c.user,
        likes: [],
        comments: [{ videoTitle: c.video.title }],
        isSubscriber: false,
      });
    }
  }

  const channelSubs = await safeFindMany(() =>
    prisma.subscription.findMany({
      where: { channelId },
      include: {
        subscriber: {
          select: {
            id: true,
            fullName: true,
            email: true,
            country: true,
            phoneNumber: true,
            phoneCode: true,
            phone: true,
            fullPhoneNumber: true,
            role: true,
          },
        },
      },
    })
  );

  for (const s of channelSubs) {
    const existing = interactorMap.get(s.subscriberId);
    if (existing) {
      existing.isSubscriber = true;
    } else {
      interactorMap.set(s.subscriberId, {
        user: s.subscriber,
        likes: [],
        comments: [],
        isSubscriber: true,
      });
    }
  }

  const interactors = Array.from(interactorMap.values()).map((entry) => ({
    ...entry,
    totalInteractions:
      entry.likes.length + entry.comments.length + (entry.isSubscriber ? 1 : 0),
  }));

  interactors.sort((a, b) => b.totalInteractions - a.totalInteractions);

  return NextResponse.json({ interactors });
}
