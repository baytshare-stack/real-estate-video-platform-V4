import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { channel: true },
  });

  if (!user?.channel) {
    return NextResponse.json({ error: 'No channel found' }, { status: 404 });
  }

  // Verify ownership before deleting
  const video = await prisma.video.findFirst({
    where: { id, channelId: user.channel.id },
  });

  if (!video) {
    return NextResponse.json({ error: 'Video not found or not yours' }, { status: 404 });
  }

  await prisma.video.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
