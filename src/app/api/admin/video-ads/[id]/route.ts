import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { VideoAdPosition } from "@prisma/client";

const POSITIONS: VideoAdPosition[] = ["BEFORE", "MID", "AFTER", "OVERLAY"];

function isPosition(v: unknown): v is VideoAdPosition {
  return typeof v === "string" && (POSITIONS as string[]).includes(v);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      videoId?: string;
      position?: string;
      isActive?: boolean;
    };

    const data: {
      title?: string;
      description?: string | null;
      videoId?: string;
      position?: VideoAdPosition;
      isActive?: boolean;
    } = {};

    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) return NextResponse.json({ error: "title cannot be empty." }, { status: 400 });
      data.title = t;
    }
    if (body.description !== undefined) {
      data.description = body.description === null ? null : String(body.description).trim() || null;
    }
    if (typeof body.videoId === "string") {
      const vid = body.videoId.trim();
      if (!vid) return NextResponse.json({ error: "videoId cannot be empty." }, { status: 400 });
      const v = await prisma.video.findUnique({ where: { id: vid }, select: { id: true } });
      if (!v) return NextResponse.json({ error: "Video not found." }, { status: 404 });
      data.videoId = vid;
    }
    if (body.position !== undefined) {
      if (!isPosition(body.position)) {
        return NextResponse.json({ error: "Invalid position." }, { status: 400 });
      }
      data.position = body.position;
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    await prisma.videoAd.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update video ad." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.videoAd.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete video ad." }, { status: 500 });
  }
}
