import type { PropertyStatus, PropertyType, TargetUserIntent, VideoPropertyType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type WatchVideoContext = {
  videoId: string;
  channelOwnerId: string;
  country: string | null;
  city: string | null;
  propertyTypeKey: string | null;
  price: Prisma.Decimal | null;
  intent: TargetUserIntent | null;
};

function propertyStatusToIntent(status: PropertyStatus | null | undefined): TargetUserIntent | null {
  if (status === "FOR_SALE") return "BUY";
  if (status === "FOR_RENT") return "RENT";
  return null;
}

function videoPropertyToKey(v: VideoPropertyType | null | undefined): string | null {
  return v ? String(v) : null;
}

function propertyTypeToKey(p: PropertyType | null | undefined): string | null {
  return p ? String(p) : null;
}

export async function loadWatchVideoContext(videoId: string): Promise<WatchVideoContext | null> {
  const row = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      category: true,
      location: true,
      propertyType: true,
      channel: { select: { ownerId: true } },
      property: {
        select: {
          country: true,
          city: true,
          propertyType: true,
          price: true,
          status: true,
        },
      },
    },
  });
  if (!row?.channel?.ownerId) return null;

  const country = row.property?.country?.trim() || null;
  const city = row.property?.city?.trim() || null;
  const propertyTypeKey =
    (propertyTypeToKey(row.property?.propertyType) ??
      videoPropertyToKey(row.propertyType) ??
      row.category?.trim()) || null;
  const price = row.property?.price ?? null;
  const intent = propertyStatusToIntent(row.property?.status);

  return {
    videoId: row.id,
    channelOwnerId: row.channel.ownerId,
    country,
    city,
    propertyTypeKey,
    price,
    intent,
  };
}
