import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindMany, safeFindUnique } from "@/lib/safePrisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    const sourceVideo = await safeFindUnique(() =>
      prisma.video.findUnique({
        where: { id: videoId },
        include: { property: true },
      })
    );

    if (!sourceVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const similarProperties = await safeFindMany(() =>
      prisma.video.findMany({
        where: {
          id: { not: videoId },
          OR: [
            { property: { propertyType: sourceVideo.property?.propertyType } },
            { property: { city: sourceVideo.property?.city } },
          ],
        },
        include: {
          channel: { select: { name: true, avatar: true } },
          property: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      })
    );

    const response = similarProperties.map((video) => ({
      ...video,
      thumbnailUrl: video.thumbnail,
    }));

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
