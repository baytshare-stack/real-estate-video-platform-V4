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

  // Get unique users who liked a video on this channel
  const likers = await prisma.like.findMany({
    where: { video: { channelId } },
    include: {
      user: { select: { id: true, fullName: true, email: true, country: true, phoneNumber: true, phoneCode: true, role: true } },
      video: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get unique users who commented on a video on this channel
  const commenters = await prisma.comment.findMany({
    where: { video: { channelId } },
    include: {
      user: { select: { id: true, fullName: true, email: true, country: true, phoneNumber: true, phoneCode: true, role: true } },
      video: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Merge and deduplicate by userId — aggregate interaction details
  const interactorMap = new Map<string, {
    user: { id: string; fullName: string; email: string; country: string | null; phoneNumber: string | null; phoneCode: string | null; role: string };
    likes: { videoTitle: string }[];
    comments: { videoTitle: string; content?: string }[];
  }>();

  for (const l of likers) {
    const existing = interactorMap.get(l.user.id);
    if (existing) {
      existing.likes.push({ videoTitle: l.video.title });
    } else {
      interactorMap.set(l.user.id, { user: l.user, likes: [{ videoTitle: l.video.title }], comments: [] });
    }
  }

  for (const c of commenters) {
    const existing = interactorMap.get(c.user.id);
    if (existing) {
      existing.comments.push({ videoTitle: c.video.title });
    } else {
      interactorMap.set(c.user.id, { user: c.user, likes: [], comments: [{ videoTitle: c.video.title }] });
    }
  }

  const interactors = Array.from(interactorMap.values()).map(entry => ({
    ...entry,
    totalInteractions: entry.likes.length + entry.comments.length,
  }));

  // Sort by most interactions first
  interactors.sort((a, b) => b.totalInteractions - a.totalInteractions);

  return NextResponse.json({ interactors });
}
