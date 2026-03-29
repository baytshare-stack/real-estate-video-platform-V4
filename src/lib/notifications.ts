import prisma from "@/lib/prisma";

export const NOTIFICATION_TYPES = {
  VIDEO_COMMENT: "VIDEO_COMMENT",
  COMMENT_REPLY: "COMMENT_REPLY",
  VIDEO_LIKE: "VIDEO_LIKE",
  VIDEO_SHARED: "VIDEO_SHARED",
} as const;

export function watchVideoUrl(videoId: string, commentId?: string) {
  const base = `/watch/${videoId}`;
  return commentId ? `${base}#comment-${commentId}` : base;
}

export async function createNotification(input: {
  userId: string;
  type: string;
  message: string;
  linkUrl?: string | null;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        linkUrl: input.linkUrl ?? null,
      },
    });
  } catch (e) {
    console.error("[notifications] createNotification", e);
  }
}

function displayName(u: { fullName?: string | null; name?: string | null; profile?: { name?: string | null } | null }) {
  return (
    u.fullName?.trim() ||
    u.name?.trim() ||
    u.profile?.name?.trim() ||
    "Someone"
  );
}

export async function notifyOnVideoComment(params: {
  videoId: string;
  channelId: string;
  actorUserId: string;
  commentId: string;
  parentCommentId: string | null;
  actor: { fullName?: string | null; name?: string | null; profile?: { name?: string | null } | null };
}) {
  const who = displayName(params.actor);
  const link = watchVideoUrl(params.videoId, params.commentId);

  const channel = await prisma.channel.findUnique({
    where: { id: params.channelId },
    select: { ownerId: true },
  });
  if (!channel) return;

  if (!params.parentCommentId) {
    if (channel.ownerId !== params.actorUserId) {
      await createNotification({
        userId: channel.ownerId,
        type: NOTIFICATION_TYPES.VIDEO_COMMENT,
        message: `${who} commented on your video.`,
        linkUrl: link,
      });
    }
    return;
  }

  const parent = await prisma.comment.findUnique({
    where: { id: params.parentCommentId },
    select: { userId: true },
  });
  if (parent && parent.userId !== params.actorUserId) {
    await createNotification({
      userId: parent.userId,
      type: NOTIFICATION_TYPES.COMMENT_REPLY,
      message: `${who} replied to your comment.`,
      linkUrl: link,
    });
  }
}

export async function notifyChannelOwnerVideoLiked(params: {
  videoId: string;
  channelId: string;
  actorUserId: string;
  actorName?: string | null;
}) {
  const channel = await prisma.channel.findUnique({
    where: { id: params.channelId },
    select: { ownerId: true },
  });
  if (!channel || channel.ownerId === params.actorUserId) return;

  let who = params.actorName?.trim();
  if (!who) {
    const u = await prisma.user.findUnique({
      where: { id: params.actorUserId },
      select: { fullName: true, name: true, profile: { select: { name: true } } },
    });
    who = u ? displayName(u) : "Someone";
  }
  await createNotification({
    userId: channel.ownerId,
    type: NOTIFICATION_TYPES.VIDEO_LIKE,
    message: `${who} liked your video.`,
    linkUrl: watchVideoUrl(params.videoId),
  });
}

export async function markNotificationsReadForUser(
  userId: string,
  input: { id?: string; ids?: string[]; all?: boolean }
) {
  if (input.all) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return;
  }
  const ids = [...new Set([...(input.ids ?? []), ...(input.id ? [input.id] : [])])].filter(Boolean);
  if (!ids.length) return;
  await prisma.notification.updateMany({
    where: { userId, id: { in: ids } },
    data: { isRead: true },
  });
}

export async function notifyChannelOwnerVideoShared(params: {
  videoId: string;
  channelId: string;
  actorUserId: string | null;
  platform: string;
}) {
  const channel = await prisma.channel.findUnique({
    where: { id: params.channelId },
    select: { ownerId: true },
  });
  if (!channel) return;
  if (params.actorUserId && params.actorUserId === channel.ownerId) return;

  let who = "Someone";
  if (params.actorUserId) {
    const u = await prisma.user.findUnique({
      where: { id: params.actorUserId },
      select: { fullName: true, name: true, profile: { select: { name: true } } },
    });
    if (u) who = displayName(u);
  }

  await createNotification({
    userId: channel.ownerId,
    type: NOTIFICATION_TYPES.VIDEO_SHARED,
    message: `${who} shared your video (${params.platform}).`,
    linkUrl: watchVideoUrl(params.videoId),
  });
}
