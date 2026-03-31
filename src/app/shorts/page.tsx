import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import ShortsFeed from "@/components/shorts/ShortsFeed";
import type { ShortVideoPayload } from "@/components/shorts/types";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { safeFindMany } from "@/lib/safePrisma";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  const origin = `${proto}://${host}`;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;

  const dbVideos = await safeFindMany(() =>
    prisma.video.findMany({
      where: {
        isShort: true,
        moderationStatus: { in: ["APPROVED", "PENDING"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            previewImage: true,
            previewVideo: true,
            defaultAudio: true,
            config: true,
          },
        },
        channel: { select: { id: true, name: true, avatar: true, subscribersCount: true } },
      },
      take: 40,
    })
  );

  const ids = dbVideos.map((v) => v.id);
  const channelIds = [...new Set(dbVideos.map((v) => v.channelId))];

  const [reactionRows, subRows] = await Promise.all([
    userId && ids.length
      ? safeFindMany(() =>
          prisma.videoReaction.findMany({
            where: { userId, videoId: { in: ids } },
            select: { videoId: true, type: true },
          })
        )
      : Promise.resolve([] as { videoId: string; type: "LIKE" | "DISLIKE" }[]),
    userId && channelIds.length
      ? safeFindMany(() =>
          prisma.subscription.findMany({
            where: { subscriberId: userId, channelId: { in: channelIds } },
            select: { channelId: true },
          })
        )
      : Promise.resolve([] as { channelId: string }[]),
  ]);

  const reactionMap = Object.fromEntries(reactionRows.map((r) => [r.videoId, r.type])) as Record<
    string,
    "LIKE" | "DISLIKE"
  >;
  const subSet = new Set(subRows.map((s) => s.channelId));

  const videos: ShortVideoPayload[] = dbVideos.map((v) => ({
    id: v.id,
    title: v.title,
    videoUrl: v.videoUrl,
    thumbnail: v.thumbnail,
    isTemplate: v.isTemplate,
    templateId: v.templateId,
    template: v.template
      ? {
          id: v.template.id,
          name: v.template.name,
          type: v.template.type,
          previewImage: v.template.previewImage,
          previewVideo: v.template.previewVideo,
          defaultAudio: v.template.defaultAudio,
          config: v.template.config,
        }
      : null,
    images: v.images ?? [],
    audio: v.audio ?? null,
    channelId: v.channelId,
    channelName: v.channel.name,
    channelAvatar: v.channel.avatar,
    viewsCount: v.viewsCount,
    likesCount: v.likesCount,
    dislikesCount: v.dislikesCount,
    commentsCount: v.commentsCount,
    sharesCount: v.sharesCount,
    createdAt: v.createdAt.toISOString(),
    userReaction: (reactionMap[v.id] as "LIKE" | "DISLIKE" | undefined) ?? null,
    subscribed: subSet.has(v.channelId),
    subscribersCount: v.channel.subscribersCount,
  }));

  if (videos.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-lg font-medium text-white/70">No Shorts yet</p>
        <p className="mt-2 text-sm text-white/40">Upload vertical tours to see them here.</p>
      </div>
    );
  }

  return <ShortsFeed videos={videos} origin={origin} />;
}
