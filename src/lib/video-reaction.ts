import prisma from "@/lib/prisma";

export type UserVideoReaction = "LIKE" | "DISLIKE" | null;

export type VideoToggleResult =
  | {
      ok: true;
      userReaction: "LIKE" | "DISLIKE" | null;
      likesCount: number;
      dislikesCount: number;
      channelId: string;
      /** True when the user ended with an active LIKE after not having one (new or switched from DISLIKE). */
      likeJustAdded: boolean;
    }
  | { ok: false; error: "NOT_FOUND" };

async function toggleButton(
  userId: string,
  videoId: string,
  target: "LIKE" | "DISLIKE"
): Promise<VideoToggleResult> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, channelId: true },
  });
  if (!video) return { ok: false, error: "NOT_FOUND" };

  return prisma.$transaction(async (tx) => {
    const existing = await tx.videoReaction.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    if (!existing) {
      await tx.videoReaction.create({
        data: { userId, videoId, type: target },
      });
      await tx.video.update({
        where: { id: videoId },
        data:
          target === "LIKE"
            ? { likesCount: { increment: 1 } }
            : { dislikesCount: { increment: 1 } },
      });
      const v = await tx.video.findUnique({
        where: { id: videoId },
        select: { likesCount: true, dislikesCount: true },
      });
      return {
        ok: true as const,
        userReaction: target,
        likesCount: v!.likesCount,
        dislikesCount: v!.dislikesCount,
        channelId: video.channelId,
        likeJustAdded: target === "LIKE",
      };
    }

    if (existing.type === target) {
      await tx.videoReaction.delete({ where: { userId_videoId: { userId, videoId } } });
      await tx.video.update({
        where: { id: videoId },
        data:
          target === "LIKE"
            ? { likesCount: { decrement: 1 } }
            : { dislikesCount: { decrement: 1 } },
      });
      const v = await tx.video.findUnique({
        where: { id: videoId },
        select: { likesCount: true, dislikesCount: true },
      });
      return {
        ok: true as const,
        userReaction: null,
        likesCount: v!.likesCount,
        dislikesCount: v!.dislikesCount,
        channelId: video.channelId,
        likeJustAdded: false,
      };
    }

    await tx.videoReaction.update({
      where: { userId_videoId: { userId, videoId } },
      data: { type: target },
    });
    await tx.video.update({
      where: { id: videoId },
      data:
        target === "LIKE"
          ? { likesCount: { increment: 1 }, dislikesCount: { decrement: 1 } }
          : { dislikesCount: { increment: 1 }, likesCount: { decrement: 1 } },
    });
    const v = await tx.video.findUnique({
      where: { id: videoId },
      select: { likesCount: true, dislikesCount: true },
    });
    return {
      ok: true as const,
      userReaction: target,
      likesCount: v!.likesCount,
      dislikesCount: v!.dislikesCount,
      channelId: video.channelId,
      likeJustAdded: target === "LIKE",
    };
  });
}

export async function toggleVideoLike(userId: string, videoId: string): Promise<VideoToggleResult> {
  return toggleButton(userId, videoId, "LIKE");
}

export async function toggleVideoDislike(userId: string, videoId: string): Promise<VideoToggleResult> {
  return toggleButton(userId, videoId, "DISLIKE");
}

export async function getUserVideoReaction(
  userId: string | undefined,
  videoId: string
): Promise<UserVideoReaction> {
  if (!userId) return null;
  const row = await prisma.videoReaction.findUnique({
    where: { userId_videoId: { userId, videoId } },
    select: { type: true },
  });
  if (!row) return null;
  return row.type;
}
