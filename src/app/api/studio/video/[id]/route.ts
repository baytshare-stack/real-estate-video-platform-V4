import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { safeFindFirst, safeFindUnique } from '@/lib/safePrisma';
import type { Prisma } from '@prisma/client';

type UserWithChannel = Prisma.UserGetPayload<{ include: { channel: true } }>;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const user = (await safeFindUnique(() =>
    prisma.user.findUnique({
      where: { email },
      include: { channel: true },
    })
  )) as UserWithChannel | null;

  const ownedChannel = user?.channel;
  if (!ownedChannel) {
    return NextResponse.json({ error: 'No channel found' }, { status: 404 });
  }

  const video = await safeFindFirst(() =>
    prisma.video.findFirst({
      where: { id, channelId: ownedChannel.id },
    })
  );

  if (!video) {
    return NextResponse.json({ error: 'Video not found or not yours' }, { status: 404 });
  }

  try {
    await prisma.video.delete({ where: { id } });
  } catch (e) {
    console.error('[studio/video DELETE]', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
