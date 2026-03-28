import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { recordCrmEvent } from "@/lib/crm-events";

const spamKeywords = [
  "http://",
  "https://",
  "www.",
  ".com",
  ".net",
  "crypto",
  "bitcoin",
  "invest",
  "viagra",
  "casino",
];

function isSpam(content: string): boolean {
  const lowerContent = content.toLowerCase();
  for (const keyword of spamKeywords) {
    if (lowerContent.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/** Legacy path — prefer POST /api/comments */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { videoId, content, parentId } = body;

    if (!videoId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (isSpam(content)) {
      return NextResponse.json(
        { error: "Comment blocked due to security policy (detected spam logic)." },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const parentCommentId = typeof parentId === "string" ? parentId : null;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, channelId: true },
    });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (parentCommentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentCommentId },
        select: { videoId: true, parentCommentId: true },
      });
      if (!parent || parent.videoId !== videoId || parent.parentCommentId !== null) {
        return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
      }
    }

    const newComment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          content,
          userId,
          videoId,
          parentCommentId,
        },
        include: {
          user: { select: { fullName: true, name: true, image: true, profile: { select: { avatar: true, name: true } } } },
        },
      });
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
      metadata: { commentId: newComment.id, legacyRoute: true },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Comment API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
