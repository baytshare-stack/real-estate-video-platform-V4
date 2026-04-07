import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { listVideoCommentsForApi, createVideoCommentForApi } from "@/lib/video-comments-service";

function parseParentId(body: Record<string, unknown>): string | null | undefined {
  const a = body?.parentCommentId;
  const b = body?.parentId;
  const raw = (typeof a === "string" ? a : typeof b === "string" ? b : "").trim();
  if (!raw) return undefined;
  return raw;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    const { id: videoId } = await context.params;

    if (!videoId) {
      return NextResponse.json({ error: "Missing video id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw != null ? Number(limitRaw) : undefined;

    const { comments, reactions } = await listVideoCommentsForApi(videoId, userId, {
      limit: Number.isFinite(limit) ? limit : undefined,
    });
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const parentCommentId = parseParentId(body);

    const result = await createVideoCommentForApi(videoId, userId, content, parentCommentId ?? null);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ comment: result.comment });
  } catch (e) {
    console.error("[POST /api/videos/[id]/comments]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
