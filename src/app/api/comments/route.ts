import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { listVideoCommentsForApi, createVideoCommentForApi } from "@/lib/video-comments-service";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

function parseParentId(body: Record<string, unknown>): string | null | undefined {
  const a = body?.parentCommentId;
  const b = body?.parentId;
  const raw = (typeof a === "string" ? a : typeof b === "string" ? b : "").trim();
  if (!raw) return undefined;
  return raw;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    if (!videoId?.trim()) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400, headers: NO_STORE });
    }

    const limitRaw = searchParams.get("limit");
    const limit = limitRaw != null ? Number(limitRaw) : undefined;
    const { comments, reactions } = await listVideoCommentsForApi(videoId.trim(), userId, {
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json({ comments, reactions }, { headers: NO_STORE });
  } catch (e) {
    console.error("[GET /api/comments]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const videoId = typeof body?.videoId === "string" ? body.videoId.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const parentCommentId = parseParentId(body);

    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
    }

    const result = await createVideoCommentForApi(videoId, userId, content, parentCommentId ?? null);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ comment: result.comment });
  } catch (e) {
    console.error("[POST /api/comments]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
