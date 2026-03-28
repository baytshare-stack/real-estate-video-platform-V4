import prisma from "@/lib/prisma";
import { recordCrmEvent } from "@/lib/crm-events";
import { safeFindMany, safeFindUnique } from "@/lib/safePrisma";
import { getUserCommentReaction } from "@/lib/comment-reaction";

const spamKeywords = ["http://", "https://", "www.", ".com", ".net", "crypto", "bitcoin", "invest", "viagra", "casino"];

export const commentUserSelect = {
  id: true,
  fullName: true,
  name: true,
  image: true,
  profile: { select: { avatar: true, name: true } },
} as const;

export function isCommentSpam(content: string): boolean {
  const lower = content.toLowerCase();
  return spamKeywords.some((k) => lower.includes(k));
}

export async function listVideoCommentsForApi(
  videoId: string,
  userId: string | undefined,
  opts?: { limit?: number }
) {
  const take =
    opts?.limit != null ? Math.min(Math.max(Math.floor(opts.limit), 1), 100) : undefined;

  const top = await safeFindMany(() =>
    prisma.comment.findMany({
      where: { videoId, parentCommentId: null },
      orderBy: { createdAt: "desc" },
      ...(take != null ? { take } : {}),
      include: {
        user: { select: commentUserSelect },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: commentUserSelect } },
        },
      },
    })
  );

  const allIds = top.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]);
  const reactions: Record<string, "LIKE" | "DISLIKE" | null> = {};
  if (userId && allIds.length) {
    const rows = await safeFindMany(() =>
      prisma.commentReaction.findMany({
        where: { userId, commentId: { in: allIds } },
        select: { commentId: true, type: true },
      })
    );
    for (const r of rows) {
      reactions[r.commentId] = r.type;
    }
  }

  return { comments: top, reactions };
}

export type CreateCommentResult =
  | { ok: true; comment: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export async function createVideoCommentForApi(
  videoId: string,
  userId: string,
  content: string,
  parentCommentId: string | null | undefined
): Promise<CreateCommentResult> {
  if (!content) {
    return { ok: false, status: 400, error: "Missing content" };
  }
  if (isCommentSpam(content)) {
    return { ok: false, status: 403, error: "Comment blocked (spam filter)." };
  }

  const video = await safeFindUnique(() =>
    prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, channelId: true, commentsCount: true },
    })
  );
  if (!video) {
    return { ok: false, status: 404, error: "Video not found" };
  }

  if (parentCommentId) {
    const parent = await safeFindUnique(() =>
      prisma.comment.findUnique({
        where: { id: parentCommentId },
        select: { id: true, videoId: true, parentCommentId: true },
      })
    );
    if (!parent || parent.videoId !== videoId) {
      return { ok: false, status: 400, error: "Invalid parent comment" };
    }
    if (parent.parentCommentId !== null) {
      return { ok: false, status: 400, error: "Nested replies only one level deep" };
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        content,
        userId,
        videoId,
        parentCommentId: parentCommentId ?? null,
      },
      include: { user: { select: commentUserSelect } },
    });
    /* Only top-level comments bump the denormalized video counter (replies stay nested). */
    if (!parentCommentId) {
      await tx.video.update({
        where: { id: videoId },
        data: { commentsCount: { increment: 1 } },
      });
    }
    return c;
  });

  await recordCrmEvent({
    type: "COMMENT_CREATED",
    userId,
    videoId,
    channelId: video.channelId,
    metadata: { commentId: created.id, parentCommentId: parentCommentId ?? null },
  });

  const userReaction = await getUserCommentReaction(userId, created.id);

  return {
    ok: true,
    comment: {
      ...created,
      replies: [],
      userReaction,
    },
  };
}
