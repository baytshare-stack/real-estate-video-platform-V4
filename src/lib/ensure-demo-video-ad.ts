import type { PrismaClient } from "@prisma/client";

/**
 * If the database has no video ads yet, create a demo overlay on the oldest video.
 */
export async function ensureDemoVideoAd(prisma: PrismaClient) {
  await prisma.$transaction(async (tx) => {
    const count = await tx.videoAd.count();
    if (count > 0) return;
    const video = await tx.video.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!video) return;
    await tx.videoAd.create({
      data: {
        title: "Featured Property",
        description: "Explore premium listings and tours on BytakTube.",
        videoId: video.id,
        position: "OVERLAY",
        isActive: true,
      },
    });
  });
}
