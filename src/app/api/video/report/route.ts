import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      targetType?: string;
      targetId?: string;
      reason?: string | null;
    };
    const targetType = (body.targetType || "").trim().toUpperCase();
    const targetId = (body.targetId || "").trim();
    if (!targetId) {
      return NextResponse.json({ error: "targetId is required." }, { status: 400 });
    }
    if (targetType !== "VIDEO" && targetType !== "COMMENT") {
      return NextResponse.json({ error: "targetType must be VIDEO or COMMENT." }, { status: 400 });
    }

    if (targetType === "VIDEO") {
      const v = await prisma.video.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!v) return NextResponse.json({ error: "Video not found." }, { status: 404 });
    } else {
      const c = await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!c) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    const report = await prisma.contentReport.create({
      data: {
        targetType,
        targetId,
        reporterUserId: userId,
        reason: body.reason?.trim() || null,
      },
    });
    return NextResponse.json({ id: report.id });
  } catch {
    return NextResponse.json({ error: "Failed to submit report." }, { status: 500 });
  }
}
