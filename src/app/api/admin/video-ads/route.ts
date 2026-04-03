import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDemoVideoAd } from "@/lib/ensure-demo-video-ad";
import type { VideoAdPosition } from "@prisma/client";

const POSITIONS: VideoAdPosition[] = ["BEFORE", "MID", "AFTER", "OVERLAY"];

function isPosition(v: unknown): v is VideoAdPosition {
  return typeof v === "string" && (POSITIONS as string[]).includes(v);
}

export async function GET() {
  try {
    await ensureDemoVideoAd(prisma);
    const ads = await prisma.videoAd.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        video: { select: { id: true, title: true, thumbnail: true } },
      },
    });
    return NextResponse.json({
      ads: ads.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        videoId: a.videoId,
        videoTitle: a.video.title,
        videoThumbnail: a.video.thumbnail,
        position: a.position,
        isActive: a.isActive,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load video ads." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      videoId?: string;
      position?: string;
      isActive?: boolean;
    };
    const title = (body.title || "").trim();
    const videoId = (body.videoId || "").trim();
    if (!title || !videoId) {
      return NextResponse.json({ error: "title and videoId are required." }, { status: 400 });
    }
    const position: VideoAdPosition = isPosition(body.position) ? body.position : "OVERLAY";
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!video) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }
    const ad = await prisma.videoAd.create({
      data: {
        title,
        description: body.description?.trim() || null,
        videoId,
        position,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    });
    return NextResponse.json({ id: ad.id });
  } catch {
    return NextResponse.json({ error: "Failed to create video ad." }, { status: 500 });
  }
}
