import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { recordCrmEvent } from "@/lib/crm-events";
import { toggleVideoDislike, toggleVideoLike } from "@/lib/video-reaction";
import { notifyChannelOwnerVideoLiked } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const videoId = body?.videoId as string | undefined;
    const action = body?.action as "like" | "dislike" | undefined;

    if (!videoId || typeof videoId !== "string") {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }
    if (action !== "like" && action !== "dislike") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result =
      action === "like" ? await toggleVideoLike(userId, videoId) : await toggleVideoDislike(userId, videoId);

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
        action,
      },
    });

    if (action === "like" && result.likeJustAdded) {
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
    console.error("[api/like]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
