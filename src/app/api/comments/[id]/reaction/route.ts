import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { recordCrmEvent } from "@/lib/crm-events";
import { toggleCommentReaction } from "@/lib/comment-reaction";
import prisma from "@/lib/prisma";
import { safeFindUnique } from "@/lib/safePrisma";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: commentId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as "like" | "dislike" | undefined;
    if (action !== "like" && action !== "dislike") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await toggleCommentReaction(userId, commentId, action === "like" ? "LIKE" : "DISLIKE");
    if (!result.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const comment = await safeFindUnique(() =>
      prisma.comment.findUnique({
        where: { id: commentId },
        select: { videoId: true, video: { select: { channelId: true } } },
      })
    );

    await recordCrmEvent({
      type: "COMMENT_ENGAGEMENT",
      userId,
      videoId: comment?.videoId,
      channelId: comment?.video.channelId,
      metadata: { commentId, action },
    });

    return NextResponse.json({
      likesCount: result.likesCount,
      dislikesCount: result.dislikesCount,
      userReaction: result.userReaction,
    });
  } catch (e) {
    console.error("[comment reaction]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
