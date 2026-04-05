import type { PrismaClient } from "@prisma/client";
import { buildVideoAdMatchContext } from "@/lib/smart-ads/video-context";

/** Same high-quality listing still used elsewhere in the app for real uploads (not a placeholder blob). */
export const DEMO_SMART_AD_MEDIA_URL =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200&h=675";

/**
 * When the `Ad` inventory is empty, seed one real creative and target it to the first video’s
 * category/location so it reliably matches at least one listing in the database.
 */
export async function ensureDemoSmartAd(prisma: PrismaClient) {
  await prisma.$transaction(async (tx) => {
    const count = await tx.ad.count();
    if (count > 0) return;

    const video = await tx.video.findFirst({
      orderBy: { createdAt: "asc" },
      include: { property: { select: { city: true, country: true } } },
    });

    let targetCategory = "";
    let targetLocation = "";
    if (video) {
      const ctx = buildVideoAdMatchContext(video);
      targetCategory = ctx.categoryNorm ? video.category?.trim() || (video.propertyType ? String(video.propertyType) : "") : "";
      targetLocation =
        ctx.locationNorm && video.property
          ? [video.property.city, video.property.country].filter(Boolean).join(", ")
          : video.location?.trim() || "";
    }

    await tx.ad.create({
      data: {
        title: "Luxury Apartment Offer",
        description: "Exclusive off-market residences — book a private viewing on BytakTube.",
        mediaUrl: DEMO_SMART_AD_MEDIA_URL,
        clickUrl: null,
        targetCategory: targetCategory || "",
        targetLocation: targetLocation || "",
        position: "OVERLAY",
        priority: 10,
        isActive: true,
      },
    });
  });
}
