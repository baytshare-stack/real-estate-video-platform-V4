import type { PrismaClient } from "@prisma/client";

export async function recordSmartAdImpression(
  prisma: PrismaClient,
  input: { adId: string; videoId: string; userId?: string | null }
) {
  await prisma.$transaction([
    prisma.ad.update({
      where: { id: input.adId },
      data: { impressions: { increment: 1 } },
    }),
    prisma.adEvent.create({
      data: {
        adId: input.adId,
        videoId: input.videoId,
        userId: input.userId ?? null,
        type: "IMPRESSION",
      },
    }),
  ]);
}

export async function recordSmartAdClick(
  prisma: PrismaClient,
  input: { adId: string; videoId: string; userId?: string | null }
) {
  await prisma.$transaction([
    prisma.ad.update({
      where: { id: input.adId },
      data: { clicks: { increment: 1 } },
    }),
    prisma.adEvent.create({
      data: {
        adId: input.adId,
        videoId: input.videoId,
        userId: input.userId ?? null,
        type: "CLICK",
      },
    }),
  ]);
}
