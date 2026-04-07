import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { recordCrmEvent } from "@/lib/crm-events";
import { toggleVideoDislike, toggleVideoLike } from "@/lib/video-reaction";
import { notifyChannelOwnerVideoLiked } from "@/lib/notifications";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await context.params;
    if (!videoId) {
      return NextResponse.json({ error: "Missing video id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body?.type as string | undefined;
    if (type !== "LIKE" && type !== "DISLIKE") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const result =
      type === "LIKE" ? await toggleVideoLike(userId, videoId) : await toggleVideoDislike(userId, videoId);

    if (!result.ok) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await recordCrmEvent({
      type: "VIDEO_ENGAGEMENT",
      userId,
      videoId,
      channelId: result.channelId,
      metadata: {
        kind: "video_reaction",
        reaction: result.userReaction,
        action: type === "LIKE" ? "like" : "dislike",
      },
    });

    if (type === "LIKE" && result.likeJustAdded) {
      await notifyChannelOwnerVideoLiked({
        videoId,
        channelId: result.channelId,
        actorUserId: userId,
        actorName: session?.user?.name ?? null,
      });
    }

    return NextResponse.json({
      likesCount: result.likesCount,
      dislikesCount: result.dislikesCount,
      userReaction: result.userReaction,
    });
  } catch (e) {
    console.error("[POST /api/videos/[id]/react]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
