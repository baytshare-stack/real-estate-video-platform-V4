import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { recordCrmEvent } from "@/lib/crm-events";
import { notifyChannelOwnerVideoShared } from "@/lib/notifications";
import { safeFindUnique } from "@/lib/safePrisma";

const PLATFORMS = new Set([
  "whatsapp",
  "facebook",
  "telegram",
  "twitter",
  "linkedin",
  "tiktok",
  "copy",
]);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user?.id as string | undefined) ?? null;

    const body = await req.json().catch(() => ({}));
    const videoId = body?.videoId as string | undefined;
    const platform = (body?.platform as string | undefined)?.toLowerCase();

    if (!videoId || typeof videoId !== "string") {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }
    if (!platform || !PLATFORMS.has(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const video = await safeFindUnique(() =>
      prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, channelId: true, sharesCount: true },
      })
    );

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.videoShare.create({
        data: {
          userId: userId ?? undefined,
          videoId,
          platform,
        },
      }),
      prisma.video.update({
        where: { id: videoId },
        data: { sharesCount: { increment: 1 } },
      }),
    ]);

    const updated = await prisma.video.findUnique({
      where: { id: videoId },
      select: { sharesCount: true },
    });

    await recordCrmEvent({
      type: "VIDEO_SHARED",
      userId,
      videoId,
      channelId: video.channelId,
      metadata: { platform },
    });

    await notifyChannelOwnerVideoShared({
      videoId,
      channelId: video.channelId,
      actorUserId: userId,
      platform,
    });

    return NextResponse.json({ sharesCount: updated?.sharesCount ?? 0 });
  } catch (e) {
    console.error("[api/share]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
