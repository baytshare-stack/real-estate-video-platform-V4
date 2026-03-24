import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { safeFindUnique } from "@/lib/safePrisma";

/** Legacy toggle-like (heart). Supports LIKE/DISLIKE rows: only toggles LIKE state. */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    const userId = session.user.id;

    const existingLike = await safeFindUnique(() =>
      prisma.videoReaction.findUnique({
        where: {
          userId_videoId: { userId, videoId },
        },
      })
    );

    if (!existingLike) {
      await prisma.$transaction([
        prisma.videoReaction.create({
          data: { userId, videoId, type: "LIKE" },
        }),
        prisma.video.update({
          where: { id: videoId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      return NextResponse.json({ liked: true }, { status: 200 });
    }

    if (existingLike.type === "LIKE") {
      await prisma.$transaction([
        prisma.videoReaction.delete({
          where: { userId_videoId: { userId, videoId } },
        }),
        prisma.video.update({
          where: { id: videoId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      return NextResponse.json({ liked: false }, { status: 200 });
    }

    await prisma.$transaction([
      prisma.videoReaction.update({
        where: { userId_videoId: { userId, videoId } },
        data: { type: "LIKE" },
      }),
      prisma.video.update({
        where: { id: videoId },
        data: { likesCount: { increment: 1 }, dislikesCount: { decrement: 1 } },
      }),
    ]);
    return NextResponse.json({ liked: true }, { status: 200 });
  } catch (error) {
    console.error("Interaction API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
