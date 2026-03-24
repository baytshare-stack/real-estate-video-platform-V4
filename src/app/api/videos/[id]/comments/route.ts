import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { listVideoCommentsForApi, createVideoCommentForApi } from "@/lib/video-comments-service";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    const { id: videoId } = await context.params;

    if (!videoId) {
      return NextResponse.json({ error: "Missing video id" }, { status: 400 });
    }

    const { comments, reactions } = await listVideoCommentsForApi(videoId, userId);
    return NextResponse.json({ comments, reactions });
  } catch (e) {
    console.error("[GET /api/videos/[id]/comments]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

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
    const content = (body?.content as string | undefined)?.trim();
    const parentCommentId = body?.parentCommentId as string | null | undefined;

    const result = await createVideoCommentForApi(videoId, userId, content ?? "", parentCommentId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ comment: result.comment });
  } catch (e) {
    console.error("[POST /api/videos/[id]/comments]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
