import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { listVideoCommentsForApi, createVideoCommentForApi } from "@/lib/video-comments-service";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    const { comments, reactions } = await listVideoCommentsForApi(videoId, userId);
    return NextResponse.json({ comments, reactions });
  } catch (e) {
    console.error("[GET /api/comments]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const videoId = body?.videoId as string | undefined;
    const content = (body?.content as string | undefined)?.trim();
    const parentCommentId = body?.parentCommentId as string | null | undefined;

    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    const result = await createVideoCommentForApi(videoId, userId, content ?? "", parentCommentId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ comment: result.comment });
  } catch (e) {
    console.error("[POST /api/comments]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
