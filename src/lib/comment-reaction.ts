import prisma from "@/lib/prisma";

export type CommentToggleResult =
  | {
      ok: true;
      likesCount: number;
      dislikesCount: number;
      userReaction: "LIKE" | "DISLIKE" | null;
    }
  | { ok: false; error: "NOT_FOUND" };

export async function toggleCommentReaction(
  userId: string,
  commentId: string,
  target: "LIKE" | "DISLIKE"
): Promise<CommentToggleResult> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, videoId: true },
  });
  if (!comment) return { ok: false, error: "NOT_FOUND" };

  const data = await prisma.$transaction(async (tx) => {
    const existing = await tx.commentReaction.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (!existing) {
      await tx.commentReaction.create({
        data: { userId, commentId, type: target },
      });
      await tx.comment.update({
        where: { id: commentId },
        data:
          target === "LIKE"
            ? { likesCount: { increment: 1 } }
            : { dislikesCount: { increment: 1 } },
      });
    } else if (existing.type === target) {
      await tx.commentReaction.delete({
        where: { userId_commentId: { userId, commentId } },
      });
      await tx.comment.update({
        where: { id: commentId },
        data:
          target === "LIKE"
            ? { likesCount: { decrement: 1 } }
            : { dislikesCount: { decrement: 1 } },
      });
    } else {
      await tx.commentReaction.update({
        where: { userId_commentId: { userId, commentId } },
        data: { type: target },
      });
      await tx.comment.update({
        where: { id: commentId },
        data:
          target === "LIKE"
            ? { likesCount: { increment: 1 }, dislikesCount: { decrement: 1 } }
            : { dislikesCount: { increment: 1 }, likesCount: { decrement: 1 } },
      });
    }

    const row = await tx.comment.findUnique({
      where: { id: commentId },
      select: { likesCount: true, dislikesCount: true },
    });
    const ur = await tx.commentReaction.findUnique({
      where: { userId_commentId: { userId, commentId } },
      select: { type: true },
    });

    return {
      likesCount: row!.likesCount,
      dislikesCount: row!.dislikesCount,
      userReaction: (ur?.type ?? null) as "LIKE" | "DISLIKE" | null,
    };
  });

  return { ok: true, ...data };
}

export async function getUserCommentReaction(userId: string | undefined, commentId: string) {
  if (!userId) return null;
  const r = await prisma.commentReaction.findUnique({
    where: { userId_commentId: { userId, commentId } },
    select: { type: true },
  });
  return r?.type ?? null;
}
