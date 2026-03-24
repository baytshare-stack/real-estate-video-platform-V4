import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindMany } from "@/lib/safePrisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");

    const whereClause: Record<string, unknown> = {
      property: { isNot: null },
    };

    if (city) {
      whereClause.property = { city: { contains: city } };
    }

    const mapProperties = await safeFindMany(() =>
      prisma.video.findMany({
        where: whereClause as any,
        select: {
          id: true,
          title: true,
          thumbnail: true,
          property: {
            select: {
              propertyType: true,
              price: true,
              currency: true,
              city: true,
              status: true,
              latitude: true,
              longitude: true,
            },
          },
          channel: {
            select: { avatar: true, name: true },
          },
        },
        take: 100,
      })
    );

    const mappedProps = mapProperties.map((v) => ({
      ...v,
      propertyType: v.property?.propertyType,
      price: v.property?.price ? Number(v.property.price) : 0,
      currency: v.property?.currency || "USD",
      city: v.property?.city,
      status: v.property?.status,
      latitude: v.property?.latitude ?? null,
      longitude: v.property?.longitude ?? null,
      thumbnailUrl: v.thumbnail || null,
      channelAvatarUrl: v.channel?.avatar,
      channelName: v.channel?.name,
    }));

    return NextResponse.json(mappedProps, { status: 200 });
  } catch (error) {
    console.error("Map Data API Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
